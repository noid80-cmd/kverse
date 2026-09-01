'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'
import { setSignupIntent } from '@/lib/intent'
import { BadgeCheck, CalendarDays, Monitor, MapPin, Shuffle, ArrowRight } from 'lucide-react'

export type PublicAudition = {
  id: string
  title: string
  description: string | null
  category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null
  status: string
  agencyName: string | null
  agencyVerified: boolean
  agencyLogo: string | null
  translations: Record<string, { title?: string; description?: string }> | null
}

function translationKey(lang: string): string | null {
  if (lang === 'ko') return null
  if (lang === 'ja') return 'ja'
  if (lang === 'zh' || lang === 'zh-TW') return 'zh-CN'
  if (lang === 'th') return 'th'
  return 'en'
}

// 공개 페이지에서만 쓰는 문구라 기존 사전을 늘리지 않고 여기서 관리한다
const COPY = {
  ko: {
    open: '모집 중', closed: '마감',
    dday: (n: number) => (n === 0 ? '오늘 마감' : `마감 D-${n}`),
    deadline: '마감일', category: '분야', mode: '진행 방식',
    online: '온라인', offline: '오프라인', both: '온라인 + 오프라인',
    apply: '지원하기', applyClosed: '마감된 오디션입니다',
    applyOffline: '현장에서 진행되는 오디션입니다',
    offlineNote: '이 공고는 온라인 지원을 받지 않습니다. 지원 방법은 공고 내용을 확인해주세요.',
    how: '지원 방법',
    steps: ['Krookie 가입 (30초)', '갖고 있는 영상 선택 또는 새로 업로드', '지원 완료 — 결과는 앱으로 알려드립니다'],
    note: '이미 갖고 있는 커버 영상으로 지원할 수 있습니다. 새로 촬영하지 않아도 됩니다.',
    otherLink: '다른 오디션 보기',
    vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타',
  },
  en: {
    open: 'Now accepting', closed: 'Closed',
    dday: (n: number) => (n === 0 ? 'Closes today' : `${n} days left`),
    deadline: 'Deadline', category: 'Category', mode: 'Format',
    online: 'Online', offline: 'In person', both: 'Online + In person',
    apply: 'Apply now', applyClosed: 'This audition has closed',
    applyOffline: 'Held in person',
    offlineNote: 'This audition does not accept online applications. See the posting for how to apply.',
    how: 'How to apply',
    steps: ['Sign up for Krookie (30 seconds)', 'Pick a video you already have, or upload a new one', 'Done — you will hear back in the app'],
    note: 'You can apply with a cover video you already have. No new filming required.',
    otherLink: 'Browse other auditions',
    vocal: 'Vocal', dance: 'Dance', acting: 'Acting', rap: 'Rap', other: 'Other',
  },
} as const

function copyFor(lang: string) {
  return lang === 'ko' ? COPY.ko : COPY.en
}

function daysUntil(deadline: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${deadline}T00:00:00`)
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

export default function PublicAuditionView({ audition }: { audition: PublicAudition }) {
  const router = useRouter()
  const { lang } = useLang()
  const c = copyFor(lang)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setAuthed(!!data.session))
  }, [])

  const key = translationKey(lang)
  const title = (key && audition.translations?.[key]?.title) || audition.title
  const description = (key && audition.translations?.[key]?.description) || audition.description

  const left = audition.deadline ? daysUntil(audition.deadline) : null
  const isOpen = audition.status === 'active' && (left === null || left >= 0)
  // /dashboard/auditions 는 mode === 'offline' 공고의 지원을 막는다. 여기서도 막지 않으면
  // 지원하기를 눌러 이동한 뒤에야 지원이 안 된다는 걸 알게 된다.
  const isOffline = audition.mode === 'offline'
  const canApply = isOpen && !isOffline

  const categoryLabel = (c as unknown as Record<string, string>)[audition.category] ?? audition.category
  const modeLabel = audition.mode === 'offline' ? c.offline : audition.mode === 'both' ? c.both : c.online
  const ModeIcon = audition.mode === 'offline' ? MapPin : audition.mode === 'both' ? Shuffle : Monitor

  function apply() {
    // 목록이 아니라 이 공고의 지원 화면이 바로 열리게 한다
    const next = `/dashboard/auditions?id=${audition.id}`
    // 가입/로그인 왕복을 건너 살아남아야 하므로 URL이 아니라 localStorage에 남긴다
    setSignupIntent({ next, from: `audition:${audition.id}` })
    router.push(authed ? next : '/signup')
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#FFF8E7', color: '#241C15' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(var(--safe-top-0) + 28px) 20px 130px' }}>

        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, marginBottom: 22 }}>Krookie</div>

        <span
          style={{
            display: 'inline-block', padding: '5px 11px', borderRadius: 999,
            fontSize: 12, fontWeight: 700, marginBottom: 14,
            background: isOpen ? '#FF6F3C' : '#C9BFB1', color: '#FFFFFF',
          }}
        >
          {isOpen ? c.open : c.closed}
        </span>

        {audition.agencyName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            {audition.agencyLogo && (
              /* 기획사 로고는 공고의 신뢰도를 만드는 요소라 이름보다 먼저 보이게 둔다.
                 로고는 잘리면 안 되므로 cover가 아니라 contain. */
              <span style={{
                width: 34, height: 34, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
                background: '#FFFFFF', border: '1px solid #EAE0D1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={audition.agencyLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#8A7F6E' }}>{audition.agencyName}</span>
            {audition.agencyVerified && <BadgeCheck size={15} strokeWidth={2.2} color="#FF6F3C" />}
          </div>
        )}

        <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.3, letterSpacing: -0.6, margin: '0 0 18px' }}>
          {title}
        </h1>

        {isOpen && left !== null && (
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 13px', borderRadius: 10, marginBottom: 22,
              background: '#FFE9DF', color: '#D84A1E', fontSize: 14, fontWeight: 700,
            }}
          >
            <CalendarDays size={16} strokeWidth={2} />
            {c.dday(left)}
          </div>
        )}

        <div style={{ background: '#FFFFFF', border: '1px solid #EAE0D1', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <Row label={c.category} value={categoryLabel} />
          <Row label={c.mode} value={modeLabel} icon={<ModeIcon size={15} strokeWidth={2} color="#8A7F6E" />} />
          {audition.deadline && <Row label={c.deadline} value={audition.deadline} last />}
        </div>

        {description && (
          <p style={{ fontSize: 15, lineHeight: 1.75, color: '#3C332A', whiteSpace: 'pre-wrap', margin: '0 0 28px' }}>
            {description}
          </p>
        )}

        {/* 오프라인 공고에는 온라인 지원 절차가 적용되지 않는다 */}
        {!isOffline && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>{c.how}</h2>
            <ol style={{ margin: '0 0 14px', padding: 0, listStyle: 'none' }}>
              {c.steps.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 9 }}>
              <span
                style={{
                  flexShrink: 0, width: 21, height: 21, borderRadius: 999,
                  background: '#241C15', color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                  display: 'grid', placeItems: 'center',
                }}
              >
                {i + 1}
              </span>
                  <span style={{ fontSize: 14, lineHeight: 1.55, color: '#3C332A' }}>{s}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8A7F6E', margin: 0 }}>
          {isOffline ? c.offlineNote : c.note}
        </p>
      </div>

      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: 'rgba(255,248,231,0.94)', backdropFilter: 'blur(10px)',
          borderTop: '1px solid #EAE0D1',
          padding: '14px 20px calc(env(safe-area-inset-bottom) + 14px)',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button
            onClick={apply}
            disabled={!canApply}
            style={{
              width: '100%', height: 54, borderRadius: 14, border: 'none',
              background: canApply ? '#FF6F3C' : '#DCD2C4', color: '#FFFFFF',
              fontSize: 16, fontWeight: 800, cursor: canApply ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {canApply ? (
              <>
                {c.apply}
                <ArrowRight size={19} strokeWidth={2.4} />
              </>
            ) : isOffline ? (
              c.applyOffline
            ) : (
              c.applyClosed
            )}
          </button>

          {!canApply && (
            <button
              onClick={() => router.push(authed ? '/dashboard/auditions' : '/signup')}
              style={{
                width: '100%', marginTop: 9, height: 44, borderRadius: 12,
                border: '1px solid #EAE0D1', background: 'transparent',
                color: '#8A7F6E', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {c.otherLink}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function Row({ label, value, icon, last }: { label: string; value: string; icon?: React.ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 0', borderBottom: last ? 'none' : '1px solid #F2EBE0',
      }}
    >
      <span style={{ fontSize: 13, color: '#8A7F6E', fontWeight: 600 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700 }}>
        {icon}
        {value}
      </span>
    </div>
  )
}
