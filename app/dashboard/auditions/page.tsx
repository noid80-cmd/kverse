'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Video, CheckCircle, X } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

const CHUNK_SIZE = 10 * 1024 * 1024

type Audition = {
  id: string
  title: string
  description: string | null
  category: string
  deadline: string | null
  created_at: string
  agency: { name: string; is_verified: boolean } | null
}

type MyVideo = { id: string; title: string; thumbnail_url: string | null; video_url: string; category: string }
export default function TalentAuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [loading, setLoading] = useState(true)
  const [applicationMap, setApplicationMap] = useState<Record<string, string>>({})
  const [myId, setMyId] = useState('')
  const [myVideos, setMyVideos] = useState<MyVideo[]>([])

  // Apply modal state
  const [modalAudition, setModalAudition] = useState<Audition | null>(null)
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [selectedVideo, setSelectedVideo] = useState<MyVideo | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    const [{ data: auds }, { data: myApps }, { data: vids }] = await Promise.all([
      supabase.from('auditions')
        .select('id, title, description, category, deadline, created_at, agency:agencies(name, is_verified)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase.from('audition_applications').select('audition_id, status').eq('talent_id', user.id),
      supabase.from('videos').select('id, title, thumbnail_url, video_url, category')
        .eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
    ])

    setAuditions((auds as unknown as Audition[]) ?? [])
    const map: Record<string, string> = {}
    myApps?.forEach(a => { map[a.audition_id] = a.status })
    setApplicationMap(map)
    setMyVideos((vids as unknown as MyVideo[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openModal(audition: Audition) {
    setModalAudition(audition)
    setTab('existing')
    setSelectedVideo(null)
    setNewFile(null)
    setMessage('')
    setError('')
    setProgress(0)
  }

  function closeModal() {
    if (submitting) return
    setModalAudition(null)
  }

  async function generateThumbnail(videoFile: File): Promise<Blob | null> {
    return new Promise(resolve => {
      const video = document.createElement('video')
      let done = false
      const finish = (b: Blob | null) => { if (!done) { done = true; URL.revokeObjectURL(video.src); resolve(b) } }
      setTimeout(() => finish(null), 8000)
      video.muted = true
      video.src = URL.createObjectURL(videoFile)
      video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        canvas.toBlob(b => finish(b), 'image/jpeg', 0.8)
      }
      video.onerror = () => finish(null)
    })
  }

  async function uploadMultipart(file: File): Promise<string | null> {
    const totalParts = Math.ceil(file.size / CHUNK_SIZE)
    const createRes = await fetch('/api/r2-multipart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', filename: file.name, contentType: file.type || 'video/mp4', totalParts }),
    })
    if (!createRes.ok) { setError('업로드 준비 실패'); return null }
    const { uploadId, key, publicUrl, partUrls } = await createRes.json()

    for (let i = 0; i < totalParts; i++) {
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      let ok = false
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await new Promise<boolean>(resolve => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', partUrls[i])
          xhr.upload.onprogress = e => {
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId }),
    })
    if (!completeRes.ok) { setError('업로드 완료 실패'); return null }
    return publicUrl
  }

  async function submitApplication() {
    if (!modalAudition) return
    if (tab === 'existing' && !selectedVideo) { setError('영상을 선택해주세요'); return }
    if (tab === 'new' && !newFile) { setError('영상 파일을 선택해주세요'); return }

    setSubmitting(true); setError('')

    let videoUrl = ''
    let thumbnailUrl: string | null = null

    if (tab === 'existing' && selectedVideo) {
      videoUrl = selectedVideo.video_url
      thumbnailUrl = selectedVideo.thumbnail_url
    } else if (tab === 'new' && newFile) {
      setProgress(5)
      const uploaded = await uploadMultipart(newFile)
      if (!uploaded) { setSubmitting(false); return }
      videoUrl = uploaded
      setProgress(80)

      const thumbBlob = await generateThumbnail(newFile)
      if (thumbBlob) {
        const thumbRes = await fetch('/api/r2-upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: 'thumb.jpg', contentType: 'image/jpeg' }),
        })
        if (thumbRes.ok) {
          const { url, publicUrl } = await thumbRes.json()
          const ok = await new Promise<boolean>(resolve => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', url)
            xhr.setRequestHeader('Content-Type', 'image/jpeg')
            xhr.onload = () => resolve(xhr.status === 200)
            xhr.onerror = () => resolve(false)
            xhr.send(thumbBlob)
          })
          if (ok) thumbnailUrl = publicUrl
        }
      }
      setProgress(90)
    }

    const { error: dbErr } = await supabase.from('audition_applications').insert({
      audition_id: modalAudition.id,
      talent_id: myId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      message: message.trim() || null,
      status: 'pending',
    })

    if (dbErr) { setError('지원 실패: ' + dbErr.message); setSubmitting(false); return }

    setApplicationMap(prev => ({ ...prev, [modalAudition.id]: 'pending' }))
    setProgress(100)

    // 기획사 담당자에게 푸시 알림
    const { data: audData } = await supabase.from('auditions').select('agency_id').eq('id', modalAudition.id).single()
    if (audData?.agency_id) {
      const { data: members } = await supabase.from('agency_members').select('profile_id').eq('agency_id', audData.agency_id)
      const { data: prof } = await supabase.from('profiles').select('name').eq('id', myId).single()
      members?.forEach(m => {
        fetch('/api/push', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: m.profile_id, title: '새 오디션 지원',
            body: `${prof?.name ?? '지망생'}이 지원했어요`,
            url: `/agency/auditions/${modalAudition.id}`,
          }),
        })
      })
    }

    setSubmitting(false)
    setModalAudition(null)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>오디션 공고</h1>
        <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 24 }}>기획사의 오디션에 맞춤 영상으로 지원해보세요</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : auditions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#6366f1' }}>
              <Megaphone size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#1e1b4b' }}>아직 공고가 없어요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {auditions.map(a => {
              const appStatus = applicationMap[a.id]
              const isInvited = appStatus === 'invited'
              const isPending = appStatus === 'pending'
              const isSkip = appStatus === 'skip'
              return (
                <div key={a.id} style={{
                  background: isInvited ? 'linear-gradient(135deg, #f0fdf4, #f8fff9)' : '#fff',
                  borderRadius: 20, padding: '18px 20px',
                  border: `1px solid ${isInvited ? '#86efac' : '#e8e8f2'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {a.category.split(',').map(c => (
                      <span key={c} style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                        {categoryLabel[c] ?? c}
                      </span>
                    ))}
                    {a.agency?.is_verified && (
                      <span style={{ fontSize: 11, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>인증</span>
                    )}
                    {isInvited && <span style={{ fontSize: 11, background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: 8, fontWeight: 800 }}>초대됨 🎉</span>}
                  </div>
                  <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 16, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, marginBottom: 6 }}>{a.agency?.name ?? '기획사'}</div>
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.description}</div>
                  )}
                  {a.deadline && (
                    <div style={{ fontSize: 12, color: '#8b8baa', marginBottom: 12 }}>마감 {a.deadline}</div>
                  )}
                  {isInvited ? (
                    <Link href="/reactions" style={{ textDecoration: 'none' }}>
                      <div style={{
                        width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', textAlign: 'center',
                      }}>
                        채팅 확인하기 →
                      </div>
                    </Link>
                  ) : (
                    <button onClick={() => !appStatus && openModal(a)} style={{
                      width: '100%', padding: '12px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 700,
                      cursor: appStatus ? 'default' : 'pointer',
                      background: isPending ? '#fef9c3' : isSkip ? '#f0f0f8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: isPending ? '#ca8a04' : isSkip ? '#94a3b8' : 'white',
                    }}>
                      {isPending ? '검토중' : isSkip ? '패스됨' : '지원하기'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 지원 모달 */}
      {modalAudition && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={closeModal}>
          <div style={{
            background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '90vh',
            overflow: 'auto', padding: '24px 20px 40px',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8b8baa', marginBottom: 2 }}>{modalAudition.agency?.name}</div>
                <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 17 }}>{modalAudition.title}</div>
              </div>
              <button onClick={closeModal} style={{ background: '#f0f0f8', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b8baa' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {(['existing', 'new'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  background: tab === t ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f0f0f8',
                  color: tab === t ? 'white' : '#8b8baa',
                }}>
                  {t === 'existing' ? '기존 영상 선택' : '새 영상 업로드'}
                </button>
              ))}
            </div>

            {tab === 'existing' ? (
              <div>
                {myVideos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#8b8baa', fontSize: 14 }}>
                    업로드된 영상이 없어요
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {myVideos.map(v => (
                      <div key={v.id} onClick={() => setSelectedVideo(selectedVideo?.id === v.id ? null : v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          borderRadius: 14, cursor: 'pointer', border: '2px solid',
                          borderColor: selectedVideo?.id === v.id ? '#6366f1' : '#f0f0f8',
                          background: selectedVideo?.id === v.id ? '#eef2ff' : '#f8f8fc',
                        }}>
                        <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: '#e0e7ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {v.thumbnail_url
                            ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Video size={16} color="#a5b4fc" />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                          <div style={{ fontSize: 11, color: '#8b8baa' }}>{categoryLabel[v.category] ?? v.category}</div>
                        </div>
                        {selectedVideo?.id === v.id && <CheckCircle size={18} color="#6366f1" strokeWidth={2} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', background: newFile ? '#eef2ff' : '#f8f8fc',
                  border: `2px dashed ${newFile ? '#6366f1' : '#e0e0f0'}`,
                  borderRadius: 16, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 8,
                }}>
                  <input type="file" accept="video/*" onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setNewFile(f); setError('')
                  }} style={{ display: 'none' }} />
                  <div style={{ color: newFile ? '#6366f1' : '#94a3b8', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                    {newFile ? <CheckCircle size={28} strokeWidth={1.5} /> : <Video size={28} strokeWidth={1.5} />}
                  </div>
                  <div style={{ fontWeight: 700, color: newFile ? '#4f46e5' : '#1e1b4b', fontSize: 14 }}>
                    {newFile ? newFile.name : '영상 파일 선택'}
                  </div>
                  {newFile && <div style={{ fontSize: 12, color: '#8b8baa', marginTop: 2 }}>{(newFile.size / 1024 / 1024).toFixed(1)} MB</div>}
                </label>
                {submitting && progress > 0 && (
                  <div>
                    <div style={{ height: 5, background: '#e0e0f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#8b8baa', marginTop: 4, textAlign: 'center' }}>{progress}%</div>
                  </div>
                )}
              </div>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="한마디 (선택사항) — 지원 동기, 강점 등" rows={3}
              style={{ width: '100%', background: '#f8f8fc', border: '1px solid #e0e0f0', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#1e1b4b', resize: 'none', marginBottom: 12 }} />

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{error}</p>}

            <button onClick={submitApplication} disabled={submitting} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}>
              {submitting ? '지원 중...' : '지원하기'}
            </button>
          </div>
        </div>
      )}

      <BottomNav items={talentNav} />
    </div>
  )
}
