'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%', background: '#fff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

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
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1)
      }
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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('영상 파일을 선택해주세요.'); return }
    setError(''); setUploading(true); setProgress(10)

    const supabase = createClient()
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { router.push('/login'); return }

    const ext = file.name.split('.').pop()
    const ts = Date.now()
    const path = `videos/${user.id}/${ts}.${ext}`

    setProgress(30)
    const { error: uploadError } = await supabase.storage.from('videos').upload(path, file, { upsert: false })
    if (uploadError) { setError('업로드 실패: ' + uploadError.message); setUploading(false); return }

    setProgress(60)
    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)

    // 썸네일 자동 생성
    let thumbnailUrl: string | null = null
    const thumbBlob = await generateThumbnail(file)
    if (thumbBlob) {
      const thumbPath = `thumbnails/${user.id}/${ts}.jpg`
      const { error: thumbErr } = await supabase.storage.from('videos').upload(thumbPath, thumbBlob)
      if (!thumbErr) {
        const { data: { publicUrl: tUrl } } = supabase.storage.from('videos').getPublicUrl(thumbPath)
        thumbnailUrl = tUrl
      }
    }

    setProgress(80)
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error: dbError } = await supabase.from('videos').insert({
      talent_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      video_url: publicUrl,
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

          {/* 파일 선택 */}
          <label style={{
            display: 'block', background: file ? '#ede9fe' : '#fff', border: `2px dashed ${file ? '#6366f1' : '#d8d8ec'}`,
            borderRadius: 20, padding: 32, textAlign: 'center', cursor: 'pointer',
          }}>
            <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? '✅' : '🎬'}</div>
            <div style={{ fontWeight: 700, color: file ? '#4f46e5' : '#1e1b4b', fontSize: 15, marginBottom: 4 }}>
              {file ? file.name : '영상 파일 선택'}
            </div>
            <div style={{ fontSize: 12, color: '#8b8baa' }}>
              {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV, AVI 등 지원'}
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
