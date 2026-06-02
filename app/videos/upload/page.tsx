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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('영상 파일을 선택해주세요.'); return }
    setError(''); setUploading(true); setProgress(10)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const ext = file.name.split('.').pop()
    const path = `videos/${user.id}/${Date.now()}.${ext}`

    setProgress(30)
    const { error: uploadError } = await supabase.storage.from('kverse').upload(path, file, { upsert: false })
    if (uploadError) { setError('업로드 실패: ' + uploadError.message); setUploading(false); return }

    setProgress(70)
    const { data: { publicUrl } } = supabase.storage.from('kverse').getPublicUrl(path)

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error: dbError } = await supabase.from('videos').insert({
      talent_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      video_url: publicUrl,
      category,
      tags: tagArr,
      status: 'active',
    })

    setProgress(100)
    if (dbError) { setError('저장 실패: ' + dbError.message); setUploading(false); return }

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
