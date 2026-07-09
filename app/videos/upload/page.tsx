'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Video, ArrowLeft, Camera, RotateCcw, Upload } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

const inputStyle = {
  width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
}

const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const CHUNK_SIZE = 10 * 1024 * 1024

export default function UploadPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('vocal')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'agency_only' | 'private'>('public')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 카메라 상태
  const [recordMode, setRecordMode] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const cameraRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 },
      })
      streamRef.current = stream
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play().catch(() => {}) }
      setFacingMode('environment')
      setRecordMode(true)
    } catch {
      setError('카메라 접근 권한이 필요해요.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setRecordMode(false)
    setRecording(false)
    setRecordSecs(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''
    const recorder = new MediaRecorder(streamRef.current, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 192_000,
    })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const f = new File([blob], `recording.${ext}`, { type: blob.type })
      setFile(f)
      setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      stopCamera()
    }
    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    setRecordSecs(0)
    timerRef.current = setInterval(() => {
      setRecordSecs(s => {
        if (s + 1 >= 300) { recorderRef.current?.stop(); if (timerRef.current) clearInterval(timerRef.current) }
        return s + 1
      })
    }, 1000)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    streamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 },
      })
      streamRef.current = stream
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play().catch(() => {}) }
      setFacingMode(next)
    } catch {}
  }

  async function generateThumbnail(videoFile: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      let settled = false
      const done = (blob: Blob | null) => {
        if (settled) return
        settled = true
        URL.revokeObjectURL(video.src)
        resolve(blob)
      }
      const timer = setTimeout(() => done(null), 8000)
      video.preload = 'metadata'
      video.muted = true
      video.src = URL.createObjectURL(videoFile)
      video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
      video.onseeked = () => {
        clearTimeout(timer)
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        canvas.toBlob(blob => done(blob), 'image/jpeg', 0.8)
      }
      video.onerror = () => { clearTimeout(timer); done(null) }
    })
  }

  async function uploadMultipart(videoFile: File): Promise<string | null> {
    const contentType = videoFile.type || 'video/mp4'
    const totalParts = Math.ceil(videoFile.size / CHUNK_SIZE)

    const createRes = await fetch('/api/r2-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', filename: videoFile.name, contentType, totalParts }),
    })
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      setError('업로드 준비 실패: ' + (err.error ?? `HTTP ${createRes.status}`))
      return null
    }
    const { uploadId, key, publicUrl, partUrls } = await createRes.json()

    for (let i = 0; i < totalParts; i++) {
      const chunk = videoFile.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      let ok = false
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await new Promise<boolean>((resolve) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', partUrls[i])
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round(((i + e.loaded / e.total) / totalParts) * 70 + 10))
          }
          xhr.onload = () => resolve(xhr.status === 200)
          xhr.onerror = () => resolve(false)
          xhr.send(chunk)
        })
        if (result) { ok = true; break }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
      if (!ok) {
        setError('업로드 실패')
        fetch('/api/r2-multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', key, uploadId }) })
        return null
      }
    }

    const completeRes = await fetch('/api/r2-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId }),
    })
    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}))
      setError('업로드 완료 실패: ' + (err.error ?? `HTTP ${completeRes.status}`))
      return null
    }
    return publicUrl
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('영상 파일을 선택해주세요.'); return }
    setError(''); setUploading(true); setProgress(5)

    const supabase = createClient()
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { router.push('/login'); return }

    setProgress(10)
    const videoPublicUrl = await uploadMultipart(file)
    if (!videoPublicUrl) { setUploading(false); return }

    setProgress(80)
    let thumbnailUrl: string | null = null
    const thumbBlob = await generateThumbnail(file)
    if (thumbBlob) {
      const thumbRes = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'thumb.jpg', contentType: 'image/jpeg' }),
      })
      if (thumbRes.ok) {
        const { url: thumbPresignedUrl, publicUrl: thumbPublicUrl } = await thumbRes.json()
        const xhr = new XMLHttpRequest()
        const ok = await new Promise<boolean>(resolve => {
          xhr.open('PUT', thumbPresignedUrl)
          xhr.setRequestHeader('Content-Type', 'image/jpeg')
          xhr.onload = () => resolve(xhr.status === 200)
          xhr.onerror = () => resolve(false)
          xhr.send(thumbBlob)
        })
        if (ok) thumbnailUrl = thumbPublicUrl
      }
    }

    setProgress(90)
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error: dbError } = await supabase.from('videos').insert({
      talent_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoPublicUrl,
      thumbnail_url: thumbnailUrl,
      category,
      tags: tagArr,
      status: 'active',
      visibility,
    })

    setProgress(100)
    if (dbError) { setError('저장 실패: ' + dbError.message); setUploading(false); return }

    const { data: bms } = await supabase.from('bookmarks').select('agency_member_id').eq('talent_id', user.id)
    if (bms && bms.length > 0) {
      const { data: prof } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      const talentName = prof?.name ?? '지망생'
      const uniqueIds = [...new Set(bms.map(b => b.agency_member_id).filter(Boolean))]
      uniqueIds.forEach(agencyMemberId => {
        fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: agencyMemberId, title: `🎬 ${talentName}`, body: `새 영상을 올렸어요: ${title.trim()}`, url: '/agency/discover' }) })
      })
    }

    router.push('/videos')
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen pb-10" style={{ background: '#09090f' }}>

      {/* 카메라 오버레이 */}
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: recordMode ? 'flex' : 'none', flexDirection: 'column' }}>
        <video
          ref={cameraRef}
          autoPlay playsInline muted
          style={{ flex: 1, width: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        {/* 하단 컨트롤 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          padding: '28px 32px 52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={stopCamera} style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {recording && (
              <div style={{ fontSize: 13, fontWeight: 800, color: recordSecs >= 270 ? '#ff4444' : 'rgba(255,255,255,0.8)', letterSpacing: '0.05em' }}>
                ● {fmt(recordSecs)}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>/ 5:00</span>
              </div>
            )}
            <button onClick={recording ? stopRecording : startRecording} style={{
              width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: recording ? '#ff4444' : '#fff',
              boxShadow: recording ? '0 0 0 4px rgba(255,68,68,0.4)' : '0 0 0 4px rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {recording
                ? <div style={{ width: 22, height: 22, borderRadius: 4, background: '#fff' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff4444' }} />
              }
            </button>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              {recording ? '탭하면 중지' : '탭하면 녹화'}
            </div>
          </div>

          <button onClick={flipCamera} style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RotateCcw size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: '#eeeeff', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff' }}>{tx.videos.uploadTitle}</h1>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">

          {/* 영상 선택/촬영 */}
          <input ref={fileRef} type="file" accept="video/*" onChange={e => {
            const f = e.target.files?.[0] ?? null
            if (f && f.size > MAX_SIZE_BYTES) {
              setError(`파일 크기가 너무 커요. ${MAX_SIZE_MB}MB 이하로 올려주세요.`)
              setFile(null); e.target.value = ''
            } else {
              setError(''); setFile(f)
              if (f) setPreview(URL.createObjectURL(f))
            }
          }} style={{ display: 'none' }} />

          {preview ? (
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <video src={preview} controls playsInline
                style={{ width: '100%', display: 'block', background: '#000', maxHeight: 340, objectFit: 'contain' }} />
              <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={startCamera} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', color: '#8888aa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>다시 촬영</button>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', color: '#8888aa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>파일 선택</button>
                <button type="button" onClick={() => { setFile(null); setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null }) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={startCamera} style={{
                flex: 1, padding: '28px 12px', borderRadius: 20,
                background: '#111118', border: '1px solid rgba(6,182,212,0.3)',
                color: '#eeeeff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
                  <Camera size={22} strokeWidth={1.8} />
                </div>
                지금 촬영하기
                <span style={{ fontSize: 11, color: '#555570', fontWeight: 600 }}>후면 카메라로 녹화</span>
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                flex: 1, padding: '28px 12px', borderRadius: 20,
                background: '#111118', border: '1px dashed rgba(255,255,255,0.1)',
                color: '#555570', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={20} strokeWidth={1.8} />
                </div>
                파일 선택
                <span style={{ fontSize: 11, color: '#333350', fontWeight: 600 }}>갤러리에서 올리기</span>
              </button>
            </div>
          )}

          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={tx.videos.titleRequired} required style={inputStyle} />

          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={tx.videos.descPlaceholder} rows={3}
            style={{ ...inputStyle, resize: 'none' }} />

          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            <option value="vocal">{tx.videos.vocal}</option>
            <option value="dance">{tx.videos.dance}</option>
            <option value="acting">{tx.videos.acting}</option>
            <option value="rap">{tx.videos.rap}</option>
            <option value="other">{tx.videos.other}</option>
          </select>

          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder={tx.videos.tagsPlaceholder} style={inputStyle} />

          <div>
            <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 8, fontWeight: 600 }}>{tx.videos.visibilityLabel}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['public', 'agency_only', 'private'] as const).map(v => {
                const labels = { public: tx.videos.visibilityPublic, agency_only: tx.videos.visibilityAgency, private: tx.videos.visibilityPrivate }
                const icons = { public: '🌐', agency_only: '🏢', private: '🔒' }
                const selected = visibility === v
                return (
                  <button key={v} type="button" onClick={() => setVisibility(v)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                    background: selected ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                    color: selected ? 'white' : '#555570', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 16 }}>{icons[v]}</span>
                    <span>{labels[v]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</p>}

          {uploading && (
            <div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', transition: 'width 0.3s', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 12, color: '#8888aa', marginTop: 6, textAlign: 'center' }}>{tx.videos.uploading} {progress}%</p>
            </div>
          )}

          <button type="submit" disabled={uploading}
            className="w-full py-4 rounded-2xl text-white disabled:opacity-50 transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(6,182,212,0.35)', border: 'none', marginTop: 4 }}>
            {uploading ? tx.videos.uploading : tx.videos.uploadBtn}
          </button>
        </form>
      </div>
    </div>
  )
}
