'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuditionSchedule from '@/components/AuditionSchedule'
import BottomNav from '@/components/layout/BottomNav'
import AuditionCountdown from '@/components/AuditionCountdown'
import AuditionHero from '@/components/AuditionHero'
import { daysUntilLaunch, isRoundClosed, isRoundNotOpenYet } from '@/lib/launch'
import { useTalentNav } from '@/components/layout/talentNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Megaphone, Video, CheckCircle, X, ArrowUpDown } from 'lucide-react'
import { agencyName } from '@/lib/agencyName'
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
  agency: { name: string; name_en?: string | null; is_verified: boolean; logo_url: string | null } | null
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
// 마감은 날짜가 아니라 시각으로 본다. 날짜만 견주면 그날 자정까지 열려 있어
// 실제로 "밤 12시 마감"이 됐다 — 정해진 건 일요일 저녁 9시다.
function isExpired(deadline: string | null) {
  return isRoundClosed(deadline)
}
// 마감일이 지난 것과 운영자가 마감 처리한 것을 함께 '끝난 공고'로 본다
function isDone(a: Audition) {
  return a.status === 'closed' || isExpired(a.deadline)
}

const applyInputStyle: React.CSSProperties = {
  width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)',
  borderRadius: 12, padding: '11px 14px', fontSize: 15, color: '#241C15',
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
  // 지원이 끝난 직후 한 번만 뜬다. 프로필에 영상을 더 쌓아두라는 말을 할 수
  // 있는 자리가 여기뿐이다 — 지원 버튼을 막 누른 사람이 가장 의욕이 크다.
  const [appliedNudge, setAppliedNudge] = useState(false)
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [selectedVideo, setSelectedVideo] = useState<MyVideo | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  // 지원 정보. 가입할 때는 묻지 않고 여기서 한 번에 받는다. 적은 내용은
  // 프로필(지원 정보 칸)에 그대로 저장돼서 언제든 고칠 수 있고, 다음 회차엔
  // 자동으로 채워진다 — 처음 한 번만 길고 그 뒤로는 확인만 하면 된다.
  type ApplyInfo = {
    realName: string; birthDate: string; gender: string
    height: string; weight: string; instagram: string; phone: string; career: string
  }
  const EMPTY_INFO: ApplyInfo = {
    realName: '', birthDate: '', gender: '', height: '', weight: '', instagram: '', phone: '', career: '',
  }
  const [info, setInfo] = useState<ApplyInfo>(EMPTY_INFO)
  // 불러온 내용 그대로다. 지원서에서 고친 게 있으면 기본 정보를 덮어쓰기
  // 전에 한 번 묻는다 — 이번 한 번 다르게 적은 것이 다음 회차까지 조용히
  // 따라가면 안 된다.
  const [savedInfo, setSavedInfo] = useState<ApplyInfo>(EMPTY_INFO)
  // 이미 채워둔 사람에게 같은 폼을 매번 다시 펼쳐 보이면 지원 화면이 길어져서,
  // 영상 고르고 한마디 쓰면 끝나던 일이 서류 작성이 된다. 채워져 있으면
  // 요약만 보여주고, 고칠 사람만 펼친다.
  const [infoOpen, setInfoOpen] = useState(false)
  // 화면이 다시 보일 때마다 load()가 돈다(다른 앱에 갔다 오면 그렇다).
  // 지원 화면을 열어둔 채 인스타 아이디를 복사하러 나갔다 오면 적던 내용이
  // 통째로 지워지므로, 열려 있는 동안에는 서버 값으로 덮어쓰지 않는다.
  const modalOpenRef = useRef(false)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    const [{ data: auds }, { data: myApps }, { data: vids }, { data: prof }, { data: ident }] = await Promise.all([
      supabase.from('auditions')
        .select('id, title, description, category, mode, deadline, status, created_at, translations, agency:agencies(name, name_en, is_verified, logo_url)')
        // 'scheduled' 도 받아온다. 크론이 열어주기를 기다리면 최대 한 시간
        // 늦게 보인다 — 화면에서 시각을 직접 보고 정각에 띄운다.
        .in('status', ['active', 'closed', 'scheduled'])
        .order('created_at', { ascending: false }),
      supabase.from('audition_applications').select('audition_id, status, video_url, thumbnail_url').eq('talent_id', user.id),
      supabase.from('videos').select('id, title, thumbnail_url, video_url, category')
        .eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('birth_date, gender, height, weight, instagram, phone, career').eq('id', user.id).maybeSingle(),
      supabase.from('talent_identities').select('real_name').eq('talent_id', user.id).maybeSingle(),
    ])

    const loaded: ApplyInfo = {
      realName: (ident?.real_name as string | null) ?? '',
      birthDate: (prof?.birth_date as string | null) ?? '',
      gender: (prof?.gender as string | null) ?? '',
      height: prof?.height != null ? String(prof.height) : '',
      weight: prof?.weight != null ? String(prof.weight) : '',
      instagram: (prof?.instagram as string | null) ?? '',
      phone: (prof?.phone as string | null) ?? '',
      career: (prof?.career as string | null) ?? '',
    }
    setSavedInfo(loaded)
    if (!modalOpenRef.current) {
      setInfo(loaded)
      setInfoOpen(!Object.values(loaded).some(v => v.trim()))
    }

    // 아직 열릴 시각이 안 된 회차는 감춘다(월요일 저녁 6시에 정확히 열린다).
    const visible = ((auds as unknown as Audition[]) ?? []).filter(a => !isRoundNotOpenYet(a.deadline))
    setAuditions(visible)
    const map: Record<string, AppInfo> = {}
    myApps?.forEach(a => { map[a.audition_id] = { status: a.status, videoUrl: a.video_url, thumbnailUrl: a.thumbnail_url } })
    setApplicationMap(map)
    setMyVideos((vids as unknown as MyVideo[]) ?? [])
    setLoading(false)
    return visible
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
    if (!confirm(tx.auditions.cancelConfirm)) return
    const { error } = await supabase.from('audition_applications').delete().eq('audition_id', auditionId).eq('talent_id', myId)
    if (error) { alert(tx.auditions.cancelFailed + ': ' + error.message); return }
    setApplicationMap(prev => { const next = { ...prev }; delete next[auditionId]; return next })
    setPlayingAuditionId(null)
  }

  function openModal(audition: Audition) {
    modalOpenRef.current = true
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
    modalOpenRef.current = false
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
    if (!createRes.ok) { setError(tx.videos.uploadPrepFailed); return null }
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
        setError(tx.videos.uploadFailed)
        fetch('/api/r2-multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', key, uploadId }) })
        return null
      }
    }

    const completeRes = await fetch('/api/r2-multipart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId }),
    })
    if (!completeRes.ok) { setError(tx.videos.uploadCompleteFailed); return null }
    return publicUrl
  }

  async function submitApplication() {
    if (!modalAudition) return
    if (tab === 'existing' && !selectedVideo) { setError(tx.auditions.selectVideoError); return }
    if (tab === 'new' && !newFile) { setError(tx.videos.selectVideoFile); return }
    // 기획사가 실제 지원서에서 요구하는 항목들이다. 비워서 내면 기획사는
    // 심사할 재료가 없고, 붙여도 연락할 방법이 없다.
    const filled = info.realName.trim() && info.birthDate && info.gender
      && info.height.trim() && info.weight.trim() && info.career.trim()
      && (info.instagram.trim() || info.phone.trim())
    if (!filled) { setInfoOpen(true); setError(tx.auditions.applyInfoMissing); return }

    const keys = Object.keys(info) as (keyof ApplyInfo)[]
    const hadSaved = keys.some(k => savedInfo[k].trim())
    const changed = keys.some(k => info[k].trim() !== savedInfo[k].trim())
    // 처음 적는 사람에게는 묻지 않는다. 바꾼 게 없어도 묻지 않는다.
    if (hadSaved && changed && !confirm(tx.auditions.saveInfoConfirm)) {
      setInfo(savedInfo)
      return
    }

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
      career: info.career.trim(),
      audition_id: modalAudition.id,
      talent_id: myId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      message: message.trim() || null,
      status: 'pending',
    })

    if (dbErr) { setError(tx.auditions.applyFailed + ': ' + dbErr.message); setSubmitting(false); return }

    // 적은 내용은 기본 정보로 남긴다. 프로필의 지원 정보 칸이 이 값을 그대로
    // 보여주고, 다음 회차 지원서는 여기서 다시 채워진다.
    const { error: profErr } = await supabase.from('profiles').update({
      birth_date: info.birthDate,
      gender: info.gender,
      height: parseInt(info.height),
      weight: parseInt(info.weight),
      instagram: info.instagram.trim().replace(/^@/, '') || null,
      phone: info.phone.trim() || null,
      career: info.career.trim(),
    }).eq('id', myId)
    // 본명만 따로다 — profiles는 기획사가 통째로 읽을 수 있어서, 1차 합격
    // 전까지 가려야 하는 값을 거기 둘 수 없다.
    const { error: identErr } = await supabase.from('talent_identities')
      .upsert({ talent_id: myId, real_name: info.realName.trim(), updated_at: new Date().toISOString() })
    // 저장이 막혔는데 저장된 셈 치면, 다음 회차에 빈 폼을 다시 마주하고도
    // "고쳤냐"고 묻지 않는다. 성공했을 때만 기준값을 옮긴다.
    if (!profErr && !identErr) setSavedInfo(info)
    else console.warn('[apply] 기본 정보 저장 실패', profErr ?? identErr)

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
    modalOpenRef.current = false
    setModalAudition(null)
    setAppliedNudge(true)
  }

  // 히어로에 세울 이번 회차. 아래 일정표·목록이 같은 회차를 두 번 보여주지
  // 않도록 여기서 한 번만 고른다.
  const featured = loading ? undefined : auditions.find(a => !isDone(a))

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FFF8E7' }}>
      <div className="max-w-lg mx-auto px-4 kv-safe-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,28,21,0.09)', border: '1px solid rgba(36,28,21,0.1)', color: '#241C15', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15' }}>{tx.auditions.title}</h1>
        </div>
        <p style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 20 }}>{tx.auditions.pageDesc}</p>
      </div>

      {/* 화면을 열면 이번 회차 하나가 먼저 온다. 지망생이 앱을 다시 여는
          이유는 날짜가 아니라 "이번 주는 어디가 열렸나"다. 공고가 아직
          없으면 같은 자리에서 오픈까지 남은 날을 센다 — 카운트다운이 화면에
          두 번 나오지 않게, 세는 곳은 늘 여기 하나다. */}
      {!loading && (featured || daysUntilLaunch() >= 0) && (
        <div className="max-w-lg mx-auto px-4" style={{ marginBottom: 22 }}>
          {featured
            ? <AuditionHero
                audition={featured}
                appStatus={applicationMap[featured.id]?.status}
                onApply={() => openModal(featured)}
              />
            : <AuditionCountdown />}
        </div>
      )}

      {/* 매주 한 곳씩 돌아간다는 리듬. 위에서 이번 회차를 이미 보여줬으면
          여기서는 다음 회차들만 잇는다.
          한때 세 줄로 줄여뒀다 — 다섯 줄이 전부 "준비 중"이면 준비 중이
          주인공이 되기 때문이었다. 이제 회차마다 기획사가 들어차서, 줄이
          길수록 채워지는 게 보인다. 아직 안 정해진 한 줄은 그대로 두는 게
          낫다. 하나씩 채워지는 과정 자체가 다음 주를 기다리게 만든다. */}
      <div className="max-w-lg mx-auto px-4" style={{ marginBottom: 24 }}>
        <AuditionSchedule compact limit={5} skipDeadline={featured?.deadline} />
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* 목록에 둘 이상 있을 때만 제목과 정렬이 의미를 갖는다. 한 건뿐인데
            제목·정렬이 붙어 있으면 카드 하나를 표처럼 보이게 만든다. */}
        {!loading && auditions.filter(a => !isDone(a) && a.id !== featured?.id).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#241C15' }}>{tx.auditions.otherPosts}</span>
            <button onClick={() => setSortBy(s => s === 'recent' ? 'deadline' : 'recent')} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, color: '#D84A1E', flexShrink: 0, fontFamily: 'inherit',
            }}>
              <ArrowUpDown size={13} strokeWidth={2.2} />
              {sortBy === 'recent' ? tx.auditions.sortLatest : tx.auditions.sortDeadline}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>{tx.common.loading}</div>
        ) : !auditions.some(a => !isDone(a) || applicationMap[a.id]) ? (
          // 화면에 실제로 남는 게 있는지로 판단해야 한다. 불러온 개수로 보면,
          // 아래에서 걸러지는 지난 공고가 여기선 "있다"로 잡혀서
          // 카운트다운도 빈 화면 안내도 없는 하얀 탭이 나온다.
          daysUntilLaunch() >= 0 ? null : (
            <div style={{ background: 'rgba(36,28,21,0.05)', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed rgba(36,28,21,0.1)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,111,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#D84A1E' }}>
                <Megaphone size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#241C15' }}>{tx.auditions.noAuditions}</div>
            </div>
          )
        ) : (() => {
          const firstActiveId = featured?.id
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
                  <div style={{ fontWeight: 900, color: '#241C15', fontSize: 18 }}>{agencyName(a.agency, lang) || tx.auditions.adminNotice}</div>
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
                    {expandedId !== a.id && <span style={{ color: '#8A7F6E' }}> {tx.common.more}</span>}
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
                <div style={{ fontSize: 12, color: '#8A7F6E', marginBottom: 2 }}>{agencyName(modalAudition.agency, lang)}</div>
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
                      setError(tx.videos.fileTooBig.replace('{n}', '500'))
                      e.target.value = ''
                      return
                    }
                    const url = URL.createObjectURL(f)
                    const vid = document.createElement('video')
                    vid.src = url
                    vid.onloadedmetadata = () => {
                      URL.revokeObjectURL(url)
                      if (vid.duration > 300) {
                        setError(tx.videos.videoTooLong)
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

            {/* 지원 영상 하나로 끝나는 게 아니라는 걸 지원 전에 알려둔다.
                0개면 가장 크게 걸린다 — 기획사가 프로필에 들어와도 볼 게 없다. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              background: myVideos.length === 0 ? 'rgba(216,74,30,0.07)' : 'rgba(36,28,21,0.04)',
              border: myVideos.length === 0 ? '1px solid rgba(216,74,30,0.2)' : '1px solid rgba(36,28,21,0.08)',
              borderRadius: 14, padding: '10px 14px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#241C15' }}>
                  {tx.auditions.profileVideos} {myVideos.length}
                </div>
                <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 2, lineHeight: 1.5 }}>
                  {tx.auditions.profileVideosHint}
                </div>
              </div>
            </div>

            {/* 가입할 때는 아무것도 묻지 않는다. 오디션에 지원할 생각이 없는
                사람에게 생년월일·키·연락처를 요구하면 문맥 없이 개인정보를
                내놓으라는 말이 된다. 낼 서류라는 게 분명한 이 자리에서 받는다. */}
            <div style={{
              background: '#FFF8E7', border: '1px solid rgba(216,74,30,0.18)',
              borderRadius: 16, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#241C15' }}>{tx.auditions.applyInfoTitle}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#D84A1E',
                  background: 'rgba(216,74,30,0.1)', padding: '3px 8px', borderRadius: 6,
                }}>{tx.auditions.applyInfoAgencyOnly}</span>
              </div>
              <p style={{ fontSize: 12, color: '#8A7F6E', lineHeight: 1.6, margin: '0 0 12px', wordBreak: 'keep-all' }}>
                {infoOpen ? tx.auditions.applyInfoOnce : tx.auditions.applyInfoLoaded}
              </p>

              {!infoOpen && (
                <div style={{
                  background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.1)', borderRadius: 12,
                  padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#241C15', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 800 }}>{info.realName}</div>
                    <div style={{ color: '#8A7F6E' }}>
                      {[info.birthDate, info.height && `${info.height}cm`, info.weight && `${info.weight}kg`]
                        .filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ color: '#8A7F6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {info.career}
                    </div>
                  </div>
                  <button type="button" onClick={() => setInfoOpen(true)} style={{
                    background: 'none', border: '1px solid rgba(36,28,21,0.15)', borderRadius: 10,
                    padding: '7px 12px', fontSize: 12, fontWeight: 800, color: '#8A7F6E',
                    cursor: 'pointer', flexShrink: 0,
                  }}>{tx.auditions.applyInfoEdit}</button>
                </div>
              )}

              <div style={{ display: infoOpen ? 'flex' : 'none', flexDirection: 'column', gap: 8 }}>
                <input type="text" value={info.realName}
                  onChange={e => setInfo(f => ({ ...f, realName: e.target.value }))}
                  placeholder={tx.profile.realNameLabel} style={applyInputStyle} />
                <p style={{ fontSize: 11, color: '#8A7F6E', margin: '-4px 0 4px', lineHeight: 1.5 }}>
                  {tx.auditions.realNameCheck}
                </p>

                <div style={{ ...applyInputStyle, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: '#8A7F6E', fontWeight: 600 }}>{tx.profile.birthDate}</span>
                  <input type="date" value={info.birthDate}
                    onChange={e => setInfo(f => ({ ...f, birthDate: e.target.value }))}
                    style={{ border: 'none', outline: 'none', fontSize: 15, color: '#241C15', background: 'transparent', width: '100%', padding: 0 }} />
                </div>

                <select value={info.gender} onChange={e => setInfo(f => ({ ...f, gender: e.target.value }))} style={applyInputStyle}>
                  <option value="">{tx.profile.selectGender}</option>
                  <option value="male">{tx.profile.genderMale}</option>
                  <option value="female">{tx.profile.genderFemale}</option>
                  <option value="other">{tx.profile.genderOther}</option>
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="number" value={info.height}
                    onChange={e => setInfo(f => ({ ...f, height: e.target.value }))}
                    placeholder={tx.profile.heightPlaceholder} style={applyInputStyle} />
                  <input type="number" value={info.weight}
                    onChange={e => setInfo(f => ({ ...f, weight: e.target.value }))}
                    placeholder={tx.profile.weightPlaceholder} style={applyInputStyle} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, color: '#8A7F6E', fontWeight: 700 }}>@</span>
                  <input type="text" value={info.instagram}
                    onChange={e => setInfo(f => ({ ...f, instagram: e.target.value }))}
                    placeholder={tx.profile.instaPlaceholder} style={{ ...applyInputStyle, flex: 1 }} />
                </div>
                <input type="text" value={info.phone}
                  onChange={e => setInfo(f => ({ ...f, phone: e.target.value }))}
                  placeholder={tx.profile.phonePlaceholder} style={applyInputStyle} />

                <textarea value={info.career}
                  onChange={e => setInfo(f => ({ ...f, career: e.target.value }))}
                  placeholder={tx.auditions.careerPlaceholder} rows={3}
                  style={{ ...applyInputStyle, resize: 'none' }} />
              </div>
            </div>

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

      {appliedNudge && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setAppliedNudge(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: '24px 24px 0 0', width: '100%',
            padding: '26px 20px 40px', border: '1px solid rgba(36,28,21,0.09)',
          }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#241C15', marginBottom: 8 }}>
              {tx.auditions.appliedTitle}
            </div>
            <p style={{ fontSize: 14, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 20 }}>
              {myVideos.length === 0 ? tx.auditions.appliedDescEmpty : tx.auditions.appliedDesc}
            </p>
            <button onClick={() => router.push('/videos/upload')} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white',
              boxShadow: '0 4px 16px rgba(255,111,60,0.3)', marginBottom: 10,
            }}>
              {tx.auditions.uploadNow}
            </button>
            <button onClick={() => setAppliedNudge(false)} style={{
              width: '100%', padding: '12px', borderRadius: 16,
              border: '1px solid rgba(36,28,21,0.12)', background: 'none',
              fontSize: 15, fontWeight: 700, color: '#8A7F6E', cursor: 'pointer',
            }}>
              {tx.auditions.uploadLater}
            </button>
          </div>
        </div>
      )}

      <BottomNav items={talentNav} />
    </div>
  )
}
