'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import AuditionCountdown from '@/components/AuditionCountdown'
import { daysUntilLaunch } from '@/lib/launch'
import { useTalentNav } from '@/components/layout/talentNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Megaphone, Video, CheckCircle, X } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { sendPush } from '@/lib/notify'

const CHUNK_SIZE = 10 * 1024 * 1024

type AuditionTranslations = Record<string, { title: string; description: string }>

type Audition = {
  id: string
  title: string
  description: string | null
  category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null
  status: string
  created_at: string
  agency: { name: string; is_verified: boolean; logo_url: string | null } | null
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
// 마감일이 지난 것과 운영자가 마감 처리한 것을 함께 '끝난 공고'로 본다
function isDone(a: Audition) {
  return a.status === 'closed' || isExpired(a.deadline)
}

export default function TalentAuditionsPage() {
  const router = useRouter()
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = useTalentNav()

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

  const [sortBy, setSortBy] = useState<'recent' | 'deadline'>('recent')
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
        .select('id, title, description, category, mode, deadline, status, created_at, translations, agency:agencies(name, is_verified, logo_url)')
        .in('status', ['active', 'closed'])
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
    return (auds as unknown as Audition[]) ?? []
  }, [])

  // 공개 공고 페이지의 '지원하기'가 /dashboard/auditions?id=<공고>로 보낸다.
  // 목록만 띄우면 방금 본 공고를 다시 찾아야 하므로 그 공고의 지원 화면을 바로 연다.
  // useSearchParams 대신 location을 읽는 건 이 페이지에 Suspense 경계를
  // 새로 두지 않기 위해서다(클라이언트에서만 실행되므로 동작은 같다).
  const openedFromLink = useRef(false)
  const openFromQuery = useCallback((list: Audition[] | undefined) => {
    if (openedFromLink.current || !list) return
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    const target = list.find(a => a.id === id)
    if (!target || isDone(target)) return
    openedFromLink.current = true
    openModal(target)
  }, [])

  useEffect(() => {
    load().then(openFromQuery)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

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

    // 담당자를 여기서 찾지 않는다 — agency_members는 talent에게 RLS로 빈
    // 배열이라, 예전 코드는 알림을 한 건도 못 보내면서 에러도 안 냈다.
    // 오디션 id만 넘기고 대상 계산은 서버(/api/push)에 맡긴다.
    const { data: prof } = await supabase.from('profiles').select('name').eq('id', myId).single()
    sendPush({
      auditionId: modalAudition.id,
      title: '새 오디션 지원',
      body: `${prof?.name ?? '지망생'}이 지원했어요`,
      url: `/agency/auditions/${modalAudition.id}`,
    })

    setSubmitting(false)
    setModalAudition(null)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FFF8E7' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,28,21,0.09)', border: '1px solid rgba(36,28,21,0.1)', color: '#241C15', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15' }}>{tx.auditions.title}</h1>
        </div>
        <p style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 20 }}>{tx.auditions.pageDesc}</p>
      </div>

      {/* Featured audition card */}
      {!loading && (() => {
        const firstActive = auditions.find(a => !isDone(a))
        if (!firstActive) return null
        const appInfo = applicationMap[firstActive.id]
        const appStatus = appInfo?.status
        const canApply = !appStatus && firstActive.mode !== 'offline'
        const agencyInitials = (firstActive.agency?.name ?? '??').slice(0, 2).toUpperCase()
        return (
          <div style={{ padding: '0 16px 24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FFEDE0 0%, #FFD9BC 100%)',
              borderRadius: 24, padding: '22px 20px', position: 'relative', overflow: 'hidden',
              border: '1px solid rgba(255,111,60,0.15)',
            }}>
              {/* Glow decorations */}
              <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,111,60,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: 40, top: 20, opacity: 0.18, pointerEvents: 'none' }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C"/>
                </svg>
              </div>
              {/* FEATURED badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FF6F3C', borderRadius: 20, padding: '5px 12px', marginBottom: 16, fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: 0.5 }}>
                ✦ FEATURED
              </div>
              {/* Agency + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: firstActive.agency?.logo_url ? '#FFFFFF' : 'rgba(36,28,21,0.13)', border: '1.5px solid rgba(36,28,21,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {firstActive.agency?.logo_url
                    ? <img src={firstActive.agency.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 15, fontWeight: 900, color: '#241C15' }}>{agencyInitials}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'rgba(36,28,21,0.65)', marginBottom: 2 }}>{firstActive.agency?.name ?? tx.auditions.adminNotice}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#241C15', lineHeight: 1.2 }}>{getAuditionTitle(firstActive, lang)}</div>
                </div>
              </div>
              {/* Tags + deadline */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {firstActive.category.split(',').map(c => (
                  <span key={c} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(255,111,60,0.15)', border: '1px solid rgba(255,111,60,0.3)', color: '#D84A1E', fontSize: 12, fontWeight: 700 }}>
                    {categoryLabels[c] ?? c}
                  </span>
                ))}
                {firstActive.deadline && (
                  <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(36,28,21,0.09)', color: 'rgba(36,28,21,0.65)', fontSize: 12, fontWeight: 600 }}>
                    {tx.auditions.deadline} {firstActive.deadline}
                  </span>
                )}
              </div>
              {/* Apply button */}
              <button
                onClick={() => canApply && openModal(firstActive)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 16, border: 'none', fontSize: 15, fontWeight: 700, cursor: canApply ? 'pointer' : 'default',
                  background: appStatus === 'pending' ? 'rgba(251,191,36,0.15)' : appStatus === 'invited' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : canApply ? 'linear-gradient(135deg,#D84A1E,#FF6F3C)' : 'rgba(36,28,21,0.08)',
                  color: appStatus === 'pending' ? '#fbbf24' : appStatus ? 'white' : canApply ? 'white' : '#8A7F6E',
                  boxShadow: canApply && !appStatus ? '0 4px 16px rgba(255,111,60,0.3)' : 'none',
                }}>
                {appStatus === 'pending' ? tx.auditions.review : appStatus === 'invited' ? tx.auditions.checkChat : canApply ? `${tx.auditions.apply} →` : firstActive.mode === 'offline' ? '📍 오프라인 오디션' : tx.auditions.expiredPost}
              </button>
            </div>
          </div>
        )
      })()}

      <div className="max-w-lg mx-auto px-4">
        {/* More opportunities header */}
        {!loading && auditions.filter(a => !isDone(a)).length > 1 && (
          <div style={{ fontSize: 17, fontWeight: 800, color: '#241C15', marginBottom: 16 }}>More Opportunities</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div />
          <button onClick={() => setSortBy(s => s === 'recent' ? 'deadline' : 'recent')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: '#D84A1E', flexShrink: 0,
          }}>
            ↕ {sortBy === 'recent' ? tx.auditions.sortLatest : tx.auditions.sortDeadline}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>{tx.common.loading}</div>
        ) : auditions.length === 0 ? (
          daysUntilLaunch() >= 0 ? <AuditionCountdown /> : (
            <div style={{ background: 'rgba(36,28,21,0.05)', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(36,28,21,0.1)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,111,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#D84A1E' }}>
                <Megaphone size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#241C15' }}>{tx.auditions.noAuditions}</div>
            </div>
          )
        ) : (() => {
          const firstActiveId = auditions.find(a => !isDone(a))?.id
          const sortAuditions = (list: Audition[]) => {
            if (sortBy === 'deadline') {
              return [...list].sort((a, b) => {
                if (!a.deadline && !b.deadline) return 0
                if (!a.deadline) return 1
                if (!b.deadline) return -1
                return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0
              })
            }
            return list
          }
          const filtered = auditions
          const active = sortAuditions(filtered.filter(a => !isDone(a) && a.id !== firstActiveId))
          // 지원하지 않은 지난 공고는 볼 이유가 없다. 6월·8월에 마감된 공고가
          // 계속 떠 있으면 10/1에 열리는 첫 오디션 옆에 반년 전 것이 나란히
          // 보이고, 새로 온 지망생 눈엔 죽은 앱으로 읽힌다.
          // 내가 지원한 건 남긴다 - 결과가 궁금한 건 그것뿐이다.
          const expired = sortAuditions(
            filtered.filter(a => isDone(a) && applicationMap[a.id])
          )

          const AuditionCard = ({ a }: { a: Audition }) => {
            const exp = isDone(a)
            const appInfo = applicationMap[a.id]
            const displayTitle = getAuditionTitle(a, lang)
            const displayDesc = getAuditionDesc(a, lang)
            const appStatus = appInfo?.status
            const isInvited = appStatus === 'invited'
            const isPending = appStatus === 'pending'
            // 기획사가 심사 중에 누른 '패스'를 지망생에게 그대로 보여주면,
            // 마감도 안 됐는데 남은 기간 내내 "패스됨"이 떠 있게 된다. 대상이
            // 초중등~고등 지망생이라 그 상태로 두면 그 자리에서 이탈한다.
            // 결과는 회차가 끝난 뒤에 한 번만 전한다.
            const underReview = isPending || appStatus === 'skip'
            // 회차가 닫히면 결과를 전한다. '불합격'이라는 단어는 쓰지 않는다 —
            // 대상이 초중등~고등이라 그 말을 보면 그 자리에서 앱을 지운다.
            // 끝이 아니라 주기의 일부로 읽히게, 다음 회차를 바로 옆에 붙인다.
            const isClosed = appStatus === 'rejected'
            return (
              <div style={{
                background: isInvited ? 'rgba(34,197,94,0.08)' : exp ? 'rgba(36,28,21,0.03)' : '#FFFFFF',
                borderRadius: 20, padding: '18px 20px',
                border: `1px solid ${isInvited ? 'rgba(34,197,94,0.3)' : 'rgba(36,28,21,0.09)'}`,
                opacity: exp && !appInfo ? 0.65 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {a.agency?.logo_url && (
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                      background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.09)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <img src={a.agency.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </span>
                  )}
                  <div style={{ fontWeight: 900, color: '#241C15', fontSize: 18 }}>{a.agency?.name ?? tx.auditions.adminNotice}</div>
                  {a.agency?.is_verified && (
                    <span style={{ fontSize: 11, background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>{tx.common.verified}</span>
                  )}
                  {isInvited && <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: 8, fontWeight: 800 }}>{tx.dashboard.invited} 🎉</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, color: '#D84A1E', fontSize: 14 }}>{displayTitle}</div>
                  {a.category.split(',').map(c => (
                    <span key={c} style={{ fontSize: 11, background: 'rgba(255,111,60,0.12)', color: '#D84A1E', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                      {categoryLabels[c] ?? c}
                    </span>
                  ))}
                </div>
                {displayDesc && (
                  <div onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 10, cursor: 'pointer',
                      ...(expandedId === a.id ? { whiteSpace: 'pre-wrap' } : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }),
                    }}>
                    {displayDesc}
                    {expandedId !== a.id && <span style={{ color: '#8A7F6E' }}> 더보기</span>}
                  </div>
                )}
                {a.deadline && (
                  <div style={{ fontSize: 12, color: exp ? '#DC2626' : '#8A7F6E', fontWeight: exp ? 700 : 400, marginBottom: 12 }}>
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
                        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 100, background: 'rgba(255,111,60,0.08)', cursor: appInfo.videoUrl ? 'pointer' : 'default' }}>
                        {appInfo.thumbnailUrl
                          ? <img src={appInfo.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7F6E' }}><Video size={24} strokeWidth={1.5} /></div>
                        }
                        {appInfo.videoUrl && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(36,28,21,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white' }}>▶</div>
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
                    background: '#FFFFFF', color: '#8A7F6E', textAlign: 'center',
                  }}>
                    {tx.auditions.expiredPost}
                  </div>
                ) : a.mode === 'offline' ? (
                  <div style={{
                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 14, padding: '12px 14px', fontSize: 13, color: '#fbbf24',
                    fontWeight: 600, lineHeight: 1.5,
                  }}>
                    {tx.auditions.offlineOnlyNotice}
                  </div>
                ) : (
                  <>
                    <button onClick={() => !appStatus && openModal(a)} style={{
                      width: '100%', padding: '12px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 700,
                      cursor: appStatus ? 'default' : 'pointer',
                      background: isClosed ? 'rgba(36,28,21,0.05)'
                        : underReview ? 'rgba(251,191,36,0.12)'
                        : 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                      color: isClosed ? '#8A7F6E' : underReview ? '#fbbf24' : 'white',
                    }}>
                      {isClosed ? tx.auditions.reviewClosed
                        : underReview ? tx.auditions.review
                        : tx.auditions.apply}
                    </button>
                    {isClosed && (
                      <div style={{ fontSize: 12, color: '#8A7F6E', textAlign: 'center', marginTop: 7 }}>
                        {tx.auditions.nextRoundSoon}
                      </div>
                    )}
                    {isPending && (
                      <button onClick={() => cancelApplication(a.id)} style={{
                        width: '100%', background: 'none', border: 'none', color: '#8A7F6E',
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8A7F6E', marginBottom: 12 }}>{tx.auditions.expiredPost}</div>
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
            background: '#FFFFFF', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '90vh',
            overflow: 'auto', padding: '24px 20px 40px',
            border: '1px solid rgba(36,28,21,0.09)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8A7F6E', marginBottom: 2 }}>{modalAudition.agency?.name}</div>
                <div style={{ fontWeight: 800, color: '#241C15', fontSize: 17 }}>{modalAudition.title}</div>
              </div>
              <button onClick={closeModal} style={{ background: '#FFFFFF', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8A7F6E' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {(['existing', 'new'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  background: tab === t ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : '#FFFFFF',
                  color: tab === t ? 'white' : '#8A7F6E',
                }}>
                  {t === 'existing' ? tx.auditions.existingVideo : tx.auditions.newVideoTab}
                </button>
              ))}
            </div>

            {tab === 'existing' ? (
              <div>
                {myVideos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#8A7F6E', fontSize: 14 }}>
                    {tx.auditions.noVideosYet}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {myVideos.map(v => (
                      <div key={v.id} onClick={() => setSelectedVideo(selectedVideo?.id === v.id ? null : v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          borderRadius: 14, cursor: 'pointer', border: '2px solid',
                          borderColor: selectedVideo?.id === v.id ? '#D84A1E' : 'rgba(36,28,21,0.09)',
                          background: selectedVideo?.id === v.id ? 'rgba(255,111,60,0.12)' : '#FFFFFF',
                        }}>
                        <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,111,60,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {v.thumbnail_url
                            ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Video size={16} color="#8A7F6E" />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#241C15', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                          <div style={{ fontSize: 11, color: '#8A7F6E' }}>{categoryLabels[v.category] ?? v.category}</div>
                        </div>
                        {selectedVideo?.id === v.id && <CheckCircle size={18} color="#D84A1E" strokeWidth={2} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', background: newFile ? 'rgba(255,111,60,0.1)' : '#FFFFFF',
                  border: `2px dashed ${newFile ? '#D84A1E' : 'rgba(36,28,21,0.16)'}`,
                  borderRadius: 16, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 8,
                }}>
                  <input type="file" accept="video/*" onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    if (!f) { setNewFile(null); setError(''); return }
                    if (f.size > 500 * 1024 * 1024) {
                      setError('파일 크기는 500MB 이하여야 합니다')
                      e.target.value = ''
                      return
                    }
                    const url = URL.createObjectURL(f)
                    const vid = document.createElement('video')
                    vid.src = url
                    vid.onloadedmetadata = () => {
                      URL.revokeObjectURL(url)
                      if (vid.duration > 300) {
                        setError('영상 길이는 5분 이하여야 합니다')
                        e.target.value = ''
                        return
                      }
                      setNewFile(f); setError('')
                    }
                    vid.onerror = () => { URL.revokeObjectURL(url); setNewFile(f); setError('') }
                  }} style={{ display: 'none' }} />
                  <div style={{ color: newFile ? '#D84A1E' : '#8A7F6E', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                    {newFile ? <CheckCircle size={28} strokeWidth={1.5} /> : <Video size={28} strokeWidth={1.5} />}
                  </div>
                  <div style={{ fontWeight: 700, color: newFile ? '#D84A1E' : '#241C15', fontSize: 14 }}>
                    {newFile ? newFile.name : tx.videos.selectVideoFile}
                  </div>
                  {newFile
                    ? <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 2 }}>{(newFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    // 여기를 누르면 OS가 "보관함 / 촬영 / 파일" 시트를 띄운다.
                    // 촬영이 그 안에 들어 있는데 이름만 봐서는 모르니 적어준다.
                    // (capture 속성을 넣으면 카메라로 직행하고 보관함 선택이 사라진다)
                    : <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 4, lineHeight: 1.5 }}>{tx.videos.pickOrRecord}</div>}
                </label>
                {submitting && progress > 0 && (
                  <div>
                    <div style={{ height: 5, background: 'rgba(36,28,21,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 4, textAlign: 'center' }}>{progress}%</div>
                  </div>
                )}
              </div>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={tx.auditions.messagePlaceholder} rows={3}
              style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#241C15', resize: 'none', marginBottom: 12 }} />

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{error}</p>}

            <button onClick={submitApplication} disabled={submitting} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 700,
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white',
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(255,111,60,0.3)',
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
