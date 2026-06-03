'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%', background: '#fff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function UploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('vocal')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function generateThumbnail(videoFile: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.src = URL.createObjectURL(videoFile)
      video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        canvas.toBlob(blob => { URL.revokeObjectURL(video.src); resolve(blob) }, 'image/jpeg', 0.8)
      }
      video.onerror = () => { URL.revokeObjectURL(video.src); resolve(null) }
    })
  }

  async function uploadToR2(presignedUrl: string, fileToUpload: File | Blob, contentType: string): Promise<string | null> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 70) + 10)
      }
      xhr.onload = () => {
        if (xhr.status === 200) { resolve(null); return }
        const match = xhr.responseText.match(/<Message>(.*?)<\/Message>/)
        resolve(match ? match[1] : `업로드 실패 (HTTP ${xhr.status})`)
      }
      xhr.onerror = () => resolve('네트워크 오류')
      xhr.send(fileToUpload)
    })
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('영상 파일을 선택해주세요.'); return }
    setError(''); setUploading(true); setProgress(5)

    const supabase = createClient()
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { router.push('/login'); return }

    // 영상 presigned URL 요청
    const res = await fetch('/api/r2-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4', fileSize: file.size }),
    })
    if (!res.ok) { setError('업로드 준비 실패'); setUploading(false); return }
    const { url: videoPresignedUrl, publicUrl: videoPublicUrl } = await res.json()

    setProgress(10)

    // 영상 R2 직접 업로드
    const videoErr = await uploadToR2(videoPresignedUrl, file, file.type || 'video/mp4')
    if (videoErr) { setError('영상 업로드 실패: ' + videoErr); setUploading(false); return }

    setProgress(80)

    // 썸네일 생성 후 R2 업로드
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
        const thumbErr = await uploadToR2(thumbPresignedUrl, thumbBlob, 'image/jpeg')
        if (!thumbErr) thumbnailUrl = thumbPublicUrl
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
    })

    setProgress(100)
    if (dbError) { setError('저장 실패: ' + dbError.message); setUploading(false); return }

    // 관심 등록한 기획사들에게 푸시 알림
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

  return (
    <div className="min-h-screen pb-10" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0 }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>영상 업로드</h1>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">

          <label style={{
            display: 'block', background: file ? '#ede9fe' : '#fff', border: `2px dashed ${file ? '#6366f1' : '#d8d8ec'}`,
            borderRadius: 20, padding: 32, textAlign: 'center', cursor: 'pointer',
          }}>
            <input type="file" accept="video/*" onChange={e => {
              const f = e.target.files?.[0] ?? null
              if (f && f.size > MAX_SIZE_BYTES) {
                setError(`파일 크기가 너무 커요. ${MAX_SIZE_MB}MB 이하로 올려주세요. (선택한 파일: ${(f.size / 1024 / 1024).toFixed(0)}MB)`)
                setFile(null)
                e.target.value = ''
              } else {
                setError('')
                setFile(f)
              }
            }} style={{ display: 'none' }} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? '✅' : '🎬'}</div>
            <div style={{ fontWeight: 700, color: file ? '#4f46e5' : '#1e1b4b', fontSize: 15, marginBottom: 4 }}>
              {file ? file.name : '영상 파일 선택'}
            </div>
            <div style={{ fontSize: 12, color: '#8b8baa' }}>
              {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `MP4, MOV, AVI 등 · 최대 ${MAX_SIZE_MB}MB`}
            </div>
          </label>

          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="영상 제목 *" required style={inputStyle} />

          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="설명 (선택사항)" rows={3}
            style={{ ...inputStyle, resize: 'none' }} />

          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            <option value="vocal">🎤 보컬</option>
            <option value="dance">💃 댄스</option>
            <option value="acting">🎭 연기</option>
            <option value="rap">🎙️ 랩</option>
            <option value="other">✨ 기타</option>
          </select>

          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="태그 (쉼표로 구분, 예: 발라드, 고음)" style={inputStyle} />

          {error && <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>}

          {uploading && (
            <div>
              <div style={{ height: 6, background: '#e0e0f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', transition: 'width 0.3s', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 12, color: '#8b8baa', marginTop: 6, textAlign: 'center' }}>업로드 중... {progress}%</p>
            </div>
          )}

          <button type="submit" disabled={uploading}
            className="w-full py-4 rounded-2xl text-white disabled:opacity-50 transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)', marginTop: 4 }}>
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </form>
      </div>
    </div>
  )
}
