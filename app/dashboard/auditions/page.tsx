'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Compass, Plus, Bell, Megaphone, Video, CheckCircle, X } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

const CHUNK_SIZE = 10 * 1024 * 1024

type AuditionTranslations = Record<string, { title: string; description: string }>

type Audition = {
  id: string
  title: string
  description: string | null
  category: string
  deadline: string | null
  created_at: string
  agency: { name: string; is_verified: boolean } | null
  translations?: AuditionTranslations | null
}

function getTranslationKey(lang: string): string | null {
  if (lang === 'ko') return null
  if (lang === 'ja') return 'ja'
  if (lang === 'zh' || lang === 'zh-TW') return 'zh-CN'
  if (lang === 'th') return 'th'
  return 'en'
}

function getAuditionTitle(a: Audition, lang: string) {
  const key = getTranslationKey(lang)
  return (key && a.translations?.[key]?.title) || a.title
}

function getAuditionDesc(a: Audition, lang: string) {
  const key = getTranslationKey(lang)
  return (key && a.translations?.[key]?.description) || a.description
}

type MyVideo = { id: string; title: string; thumbnail_url: string | null; video_url: string; category: string }
const today = new Date().toISOString().slice(0, 10)
function isExpired(deadline: string | null) {
  return !!deadline && deadline < today
}

export default function TalentAuditionsPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const categoryLabels: Record<string, string> = {
    vocal: tx.videos.vocal, dance: tx.videos.dance, acting: tx.videos.acting, rap: tx.videos.rap, other: tx.videos.other,
  }

  const [auditions, setAuditions] = useState<Audition[]>([])
  const [loading, setLoading] = useState(true)
  type AppInfo = { status: string; videoUrl: string | null; thumbnailUrl: string | null }
  const [applicationMap, setApplicationMap] = useState<Record<string, AppInfo>>({})
  const [playingAuditionId, setPlayingAuditionId] = useState<string | null>(null)
  const [myId, setMyId] = useState('')
  const [myVideos, setMyVideos] = useState<MyVideo[]>([])

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
        .select('id, title, description, category, deadline, created_at, translations, agency:agencies(name, is_verified)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase.from('audition_applications').select('audition_id, status, video_url, thumbnail_url').eq('talent_id', user.id),
      supabase.from('videos').select('id, title, thumbnail_url, video_url, category')
        .eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
    ])

    setAuditions((auds as unknown as Audition[]) ?? [])
    const map: Record<string, AppInfo> = {}
    myApps?.forEach(a => { map[a.audition_id] = { status: a.status, videoUrl: a.video_url, thumbnailUrl: a.thumbnail_url } })
    setApplicationMap(map)
    setMyVideos((vids as unknown as MyVideo[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function cancelApplication(auditionId: string) {
    if (!confirm('지원을 취소할까요?')) return
    const { error } = await supabase.from('audition_applications').delete().eq('audition_id', auditionId).eq('talent_id', myId)
    if (error) { alert('취소 실패: ' + error.message); return }
    setApplicationMap(prev => { const next = { ...prev }; delete next[auditionId]; return next })
    setPlayingAuditionId(null)
  }

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
    if (tab === 'existing' && !selectedVideo) { setError(tx.auditions.selectVideoError); return }
    if (tab === 'new' && !newFile) { setError(tx.videos.selectVideoFile); return }

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

    setApplicationMap(prev => ({ ...prev, [modalAudition.id]: { status: 'pending', videoUrl: videoUrl, thumbnailUrl: thumbnailUrl } }))
    setProgress(100)

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
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: '#eeeeff', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff' }}>{tx.auditions.title}</h1>
        </div>
        <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 24 }}>{tx.auditions.pageDesc}</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#555570' }}>{tx.common.loading}</div>
        ) : auditions.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
              <Megaphone size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontWeight: 700, color: '#eeeeff' }}>{tx.auditions.noAuditions}</div>
          </div>
        ) : (() => {
          const active = auditions.filter(a => !isExpired(a.deadline))
          const expired = auditions.filter(a => isExpired(a.deadline))

          const AuditionCard = ({ a }: { a: Audition }) => {
            const exp = isExpired(a.deadline)
            const appInfo = applicationMap[a.id]
            const displayTitle = getAuditionTitle(a, lang)
            const displayDesc = getAuditionDesc(a, lang)
            const appStatus = appInfo?.status
            const isInvited = appStatus === 'invited'
            const isPending = appStatus === 'pending'
            const isSkip = appStatus === 'skip'
            return (
              <div style={{
                background: isInvited ? 'rgba(34,197,94,0.08)' : exp ? 'rgba(255,255,255,0.02)' : '#111118',
                borderRadius: 20, padding: '18px 20px',
                border: `1px solid ${isInvited ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
                opacity: exp && !appInfo ? 0.65 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ fontWeight: 900, color: '#eeeeff', fontSize: 18 }}>{a.agency?.name ?? tx.auditions.agencyLabel}</div>
                  {a.agency?.is_verified && (
                    <span style={{ fontSize: 11, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>{tx.common.verified}</span>
                  )}
                  {isInvited && <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: 8, fontWeight: 800 }}>{tx.dashboard.invited} 🎉</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: '#22d3ee', fontSize: 14 }}>{displayTitle}</div>
                  {a.category.split(',').map(c => (
                    <span key={c} style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                      {categoryLabels[c] ?? c}
                    </span>
                  ))}
                </div>
                {displayDesc && (
                  <div style={{ fontSize: 13, color: '#8888aa', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{displayDesc}</div>
                )}
                {a.deadline && (
                  <div style={{ fontSize: 12, color: exp ? '#f87171' : '#555570', fontWeight: exp ? 700 : 400, marginBottom: 12 }}>
                    {exp ? `${tx.auditions.expired} · ` : `${tx.auditions.deadline} `}{a.deadline}
                  </div>
                )}
                {appInfo && (
                  <div style={{ marginBottom: 10 }}>
                    {playingAuditionId === a.id ? (
                      <video src={appInfo.videoUrl ?? ''} controls autoPlay playsInline
                        style={{ width: '100%', borderRadius: 12, maxHeight: 220, background: '#000', display: 'block' }} />
                    ) : (
                      <div onClick={() => appInfo.videoUrl && setPlayingAuditionId(a.id)}
                        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 100, background: 'rgba(6,182,212,0.08)', cursor: appInfo.videoUrl ? 'pointer' : 'default' }}>
                        {appInfo.thumbnailUrl
                          ? <img src={appInfo.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}><Video size={24} strokeWidth={1.5} /></div>
                        }
                        {appInfo.videoUrl && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white' }}>▶</div>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, color: 'white', fontWeight: 700, background: 'rgba(0,0,0,0.45)', padding: '2px 7px', borderRadius: 6 }}>{tx.auditions.submittedVideo}</div>
                      </div>
                    )}
                  </div>
                )}
                {isInvited ? (
                  <Link href="/reactions" style={{ textDecoration: 'none' }}>
                    <div style={{
                      width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', textAlign: 'center',
                    }}>
                      {tx.auditions.checkChat}
                    </div>
                  </Link>
                ) : exp ? (
                  <div style={{
                    width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                    background: '#1a1a25', color: '#555570', textAlign: 'center',
                  }}>
                    {tx.auditions.expiredPost}
                  </div>
                ) : (
                  <>
                    <button onClick={() => !appStatus && openModal(a)} style={{
                      width: '100%', padding: '12px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 700,
                      cursor: appStatus ? 'default' : 'pointer',
                      background: isPending ? 'rgba(251,191,36,0.12)' : isSkip ? '#1a1a25' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      color: isPending ? '#fbbf24' : isSkip ? '#555570' : 'white',
                    }}>
                      {isPending ? tx.auditions.review : isSkip ? tx.auditions.skipped : tx.auditions.apply}
                    </button>
                    {isPending && (
                      <button onClick={() => cancelApplication(a.id)} style={{
                        width: '100%', background: 'none', border: 'none', color: '#555570',
                        fontSize: 12, cursor: 'pointer', marginTop: 6, textDecoration: 'underline',
                      }}>
                        {tx.auditions.cancelApplication}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          }

          return (
            <>
              {active.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: expired.length > 0 ? 28 : 0 }}>
                  {active.map(a => <AuditionCard key={a.id} a={a} />)}
                </div>
              )}
              {expired.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#555570', marginBottom: 12 }}>{tx.auditions.expiredPost}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {expired.map(a => <AuditionCard key={a.id} a={a} />)}
                  </div>
                </>
              )}
            </>
          )
        })()}
      </div>

      {modalAudition && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={closeModal}>
          <div style={{
            background: '#111118', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '90vh',
            overflow: 'auto', padding: '24px 20px 40px',
            border: '1px solid rgba(255,255,255,0.07)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#555570', marginBottom: 2 }}>{modalAudition.agency?.name}</div>
                <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 17 }}>{modalAudition.title}</div>
              </div>
              <button onClick={closeModal} style={{ background: '#1a1a25', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555570' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {(['existing', 'new'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  background: tab === t ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                  color: tab === t ? 'white' : '#555570',
                }}>
                  {t === 'existing' ? tx.auditions.existingVideo : tx.auditions.newVideoTab}
                </button>
              ))}
            </div>

            {tab === 'existing' ? (
              <div>
                {myVideos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#555570', fontSize: 14 }}>
                    {tx.auditions.noVideosYet}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {myVideos.map(v => (
                      <div key={v.id} onClick={() => setSelectedVideo(selectedVideo?.id === v.id ? null : v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          borderRadius: 14, cursor: 'pointer', border: '2px solid',
                          borderColor: selectedVideo?.id === v.id ? '#0891b2' : 'rgba(255,255,255,0.07)',
                          background: selectedVideo?.id === v.id ? 'rgba(6,182,212,0.12)' : '#1a1a25',
                        }}>
                        <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'rgba(6,182,212,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {v.thumbnail_url
                            ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Video size={16} color="#555570" />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#eeeeff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                          <div style={{ fontSize: 11, color: '#555570' }}>{categoryLabels[v.category] ?? v.category}</div>
                        </div>
                        {selectedVideo?.id === v.id && <CheckCircle size={18} color="#0891b2" strokeWidth={2} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', background: newFile ? 'rgba(6,182,212,0.1)' : '#1a1a25',
                  border: `2px dashed ${newFile ? '#0891b2' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 16, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 8,
                }}>
                  <input type="file" accept="video/*" onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setNewFile(f); setError('')
                  }} style={{ display: 'none' }} />
                  <div style={{ color: newFile ? '#22d3ee' : '#555570', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                    {newFile ? <CheckCircle size={28} strokeWidth={1.5} /> : <Video size={28} strokeWidth={1.5} />}
                  </div>
                  <div style={{ fontWeight: 700, color: newFile ? '#22d3ee' : '#eeeeff', fontSize: 14 }}>
                    {newFile ? newFile.name : tx.videos.selectVideoFile}
                  </div>
                  {newFile && <div style={{ fontSize: 12, color: '#555570', marginTop: 2 }}>{(newFile.size / 1024 / 1024).toFixed(1)} MB</div>}
                </label>
                {submitting && progress > 0 && (
                  <div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#555570', marginTop: 4, textAlign: 'center' }}>{progress}%</div>
                  </div>
                )}
              </div>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={tx.auditions.messagePlaceholder} rows={3}
              style={{ width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#eeeeff', resize: 'none', marginBottom: 12 }} />

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{error}</p>}

            <button onClick={submitApplication} disabled={submitting} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
            }}>
              {submitting ? tx.auditions.submitting : tx.auditions.apply}
            </button>
          </div>
        </div>
      )}

      <BottomNav items={talentNav} />
    </div>
  )
}
