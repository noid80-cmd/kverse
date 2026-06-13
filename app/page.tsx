'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const langs = ['한국어', 'English', '日本語', '中文', 'ภาษาไทย'] as const
type Lang = typeof langs[number]

const langToAppCode: Record<Lang, string> = {
  '한국어': 'ko', 'English': 'en', '日本語': 'ja', '中文': 'zh', 'ภาษาไทย': 'th',
}
const appCodeToLang: Record<string, Lang> = {
  'ko': '한국어', 'en': 'English', 'ja': '日本語', 'zh': '中文', 'zh-TW': '中文', 'th': 'ภาษาไทย',
}

const t: Record<Lang, {
  tagline: string
  hero: string
  heroSub: string
  ctaTalent: string
  ctaAgency: string
  login: string
  forTalent: string
  forAgency: string
  talentTitle: string
  talentPoints: string[]
  agencyTitle: string
  agencyPoints: string[]
  howTitle: string
  steps: { title: string; desc: string }[]
  ctaTitle: string
  ctaSub: string
  ctaStart: string
  footerDesc: string
}> = {
  '한국어': {
    tagline: '기획사가 직접 발굴하는 오디션 플랫폼',
    hero: '당신의 재능,\n기획사에게 직접',
    heroSub: '영상 하나로 전세계 기획사 담당자에게 노출되세요.\nKpick은 오디션의 새로운 방식입니다.',
    ctaTalent: '지망생으로 시작하기',
    ctaAgency: '기획사 문의',
    login: '로그인',
    forTalent: '지망생',
    forAgency: '기획사',
    talentTitle: '재능을 보여줄 무대가 생겼어요',
    talentPoints: ['영상 업로드 한 번으로 전세계 기획사에 노출', '기획사가 먼저 연락해요', '오디션 공고를 한 곳에서 확인', '관심 표시와 채팅으로 바로 소통'],
    agencyTitle: '검증된 인재를 더 빠르게',
    agencyPoints: ['전세계 지망생 영상을 한 곳에서 탐색', '원하는 조건으로 필터링', '관심 표시로 풀 구성', '채팅으로 바로 연락'],
    howTitle: '이렇게 작동해요',
    steps: [
      { title: '영상 업로드', desc: '보컬, 댄스, 연기 등 나의 재능을 담은 영상을 올리세요' },
      { title: '기획사 탐색', desc: '전국 기획사 담당자들이 영상을 보고 관심 표시를 합니다' },
      { title: '직접 연결', desc: '채팅으로 바로 소통하고 오디션 기회를 잡으세요' },
    ],
    ctaTitle: '지금 바로 시작해보세요',
    ctaSub: '가입은 무료입니다',
    ctaStart: '무료로 시작하기',
    footerDesc: '기획사가 직접 발굴하는 오디션 플랫폼',
  },
  'English': {
    tagline: 'The audition platform where agencies find you',
    hero: 'Your talent,\ndirectly to agencies',
    heroSub: 'Upload one video and get discovered by agencies across Korea.\nKpick is a new way to audition.',
    ctaTalent: 'Start as a talent',
    ctaAgency: 'For agencies',
    login: 'Log in',
    forTalent: 'Talents',
    forAgency: 'Agencies',
    talentTitle: 'A stage to show your talent',
    talentPoints: ['One upload, exposed to agencies nationwide', 'Agencies reach out to you first', 'All audition listings in one place', 'Communicate directly via chat'],
    agencyTitle: 'Discover talent faster',
    agencyPoints: ['Browse talent videos from across Korea', 'Filter by category and criteria', 'Build your shortlist with bookmarks', 'Reach out directly via chat'],
    howTitle: 'How it works',
    steps: [
      { title: 'Upload a video', desc: 'Show your vocal, dance, acting or other talents in a short video' },
      { title: 'Get discovered', desc: 'Agency scouts browse videos and bookmark the ones they like' },
      { title: 'Connect directly', desc: 'Chat directly with agencies and land your audition opportunity' },
    ],
    ctaTitle: 'Start today',
    ctaSub: 'Free to join',
    ctaStart: 'Get started free',
    footerDesc: 'The audition platform where agencies find you',
  },
  '日本語': {
    tagline: '芸能事務所が直接スカウトするオーディションプラットフォーム',
    hero: 'あなたの才能を\n事務所へ直接届ける',
    heroSub: '動画1本で全国の芸能事務所にアピール。\nKpickは新しいオーディションのかたちです。',
    ctaTalent: 'タレントとして始める',
    ctaAgency: '事務所の方はこちら',
    login: 'ログイン',
    forTalent: 'タレント',
    forAgency: '事務所',
    talentTitle: '才能を見せる舞台が生まれた',
    talentPoints: ['動画1本で全国の事務所に露出', '事務所から直接連絡が来る', 'オーディション情報を一括確認', 'チャットで直接コミュニケーション'],
    agencyTitle: '優秀な人材をより早く発掘',
    agencyPoints: ['全国のタレント動画を一覧で閲覧', '条件でフィルタリング', 'お気に入り登録でリスト管理', 'チャットで直接連絡'],
    howTitle: '使い方',
    steps: [
      { title: '動画をアップロード', desc: 'ボーカル、ダンス、演技など自分の才能を動画で投稿' },
      { title: '事務所に発見される', desc: '全国の芸能事務所のスカウトが動画を閲覧し、お気に入り登録' },
      { title: '直接つながる', desc: 'チャットで事務所と直接やり取りし、チャンスをつかもう' },
    ],
    ctaTitle: '今すぐ始めよう',
    ctaSub: '登録無料',
    ctaStart: '無料で始める',
    footerDesc: '芸能事務所が直接スカウトするオーディションプラットフォーム',
  },
  '中文': {
    tagline: '经纪公司直接发掘人才的试镜平台',
    hero: '你的才华\n直达经纪公司',
    heroSub: '上传一个视频，让全国经纪公司发现你。\nKpick是全新的试镜方式。',
    ctaTalent: '以艺人身份开始',
    ctaAgency: '经纪公司咨询',
    login: '登录',
    forTalent: '艺人',
    forAgency: '经纪公司',
    talentTitle: '展示才华的舞台',
    talentPoints: ['上传一次视频，曝光给全国经纪公司', '经纪公司主动联系你', '在一处查看所有试镜公告', '通过聊天直接沟通'],
    agencyTitle: '更快发掘优秀人才',
    agencyPoints: ['在一处浏览全国艺人视频', '按条件筛选', '通过收藏建立人才库', '直接通过聊天联系'],
    howTitle: '使用方式',
    steps: [
      { title: '上传视频', desc: '上传展示你的声乐、舞蹈、表演等才华的视频' },
      { title: '被经纪公司发现', desc: '全国经纪公司的星探浏览视频并收藏感兴趣的人才' },
      { title: '直接建立联系', desc: '通过聊天直接与经纪公司沟通，把握试镜机会' },
    ],
    ctaTitle: '立即开始',
    ctaSub: '注册免费',
    ctaStart: '免费开始',
    footerDesc: '经纪公司直接发掘人才的试镜平台',
  },
  'ภาษาไทย': {
    tagline: 'แพลตฟอร์มออดิชันที่ค่ายเพลงค้นหาคุณเอง',
    hero: 'พรสวรรค์ของคุณ\nถึงมือค่ายเพลงโดยตรง',
    heroSub: 'อัปโหลดวิดีโอเดียว แล้วให้ค่ายเพลงทั่วประเทศค้นพบคุณ\nKpick คือวิธีออดิชันแบบใหม่',
    ctaTalent: 'เริ่มต้นในฐานะศิลปิน',
    ctaAgency: 'สำหรับค่ายเพลง',
    login: 'เข้าสู่ระบบ',
    forTalent: 'ศิลปิน',
    forAgency: 'ค่ายเพลง',
    talentTitle: 'เวทีแสดงพรสวรรค์ของคุณ',
    talentPoints: ['อัปโหลดครั้งเดียว เข้าถึงค่ายเพลงทั่วประเทศ', 'ค่ายเพลงติดต่อคุณก่อน', 'ดูประกาศออดิชันทุกที่ในที่เดียว', 'สื่อสารโดยตรงผ่านแชท'],
    agencyTitle: 'ค้นหาพรสวรรค์ได้เร็วขึ้น',
    agencyPoints: ['เรียกดูวิดีโอของศิลปินทั่วประเทศ', 'กรองตามเงื่อนไขที่ต้องการ', 'สร้างรายชื่อด้วยการบุ๊กมาร์ก', 'ติดต่อโดยตรงผ่านแชท'],
    howTitle: 'วิธีการใช้งาน',
    steps: [
      { title: 'อัปโหลดวิดีโอ', desc: 'แสดงความสามารถด้านร้อง เต้น แสดง หรืออื่นๆ ในวิดีโอสั้น' },
      { title: 'ถูกค้นพบ', desc: 'ผู้สรรหาจากค่ายเพลงเรียกดูวิดีโอและบุ๊กมาร์กที่สนใจ' },
      { title: 'เชื่อมต่อโดยตรง', desc: 'แชทกับค่ายเพลงโดยตรงและคว้าโอกาสออดิชัน' },
    ],
    ctaTitle: 'เริ่มต้นวันนี้เลย',
    ctaSub: 'สมัครฟรี',
    ctaStart: 'เริ่มต้นฟรี',
    footerDesc: 'แพลตฟอร์มออดิชันที่ค่ายเพลงค้นหาคุณเอง',
  },
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('kpick-lang')
      return (saved && appCodeToLang[saved]) ? appCodeToLang[saved] : '한국어'
    } catch { return '한국어' }
  })
  const [tab, setTab] = useState<'talent' | 'agency'>('talent')
  const [ready, setReady] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const tx = t[lang]

  function changeLang(l: Lang) {
    setLang(l)
    try { localStorage.setItem('kpick-lang', langToAppCode[l]) } catch {}
  }

  useEffect(() => {
    if (!langOpen) return
    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) { setReady(true); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role ?? 'talent'
      if (role === 'admin') window.location.href = '/admin/users'
      else if (role === 'agency') window.location.href = '/agency/discover'
      else window.location.href = '/dashboard'
    })
  }, [])

  if (!ready) return <div style={{ minHeight: '100vh', background: '#07070d' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', color: '#eeeeff', fontFamily: 'inherit', overflowX: 'hidden' }}>

      {/* Atmospheric bg */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 700, background: 'radial-gradient(ellipse at center top, rgba(6,182,212,0.13) 0%, rgba(8,145,178,0.05) 40%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.012) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(145deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>K</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#eeeeff' }}>Kpick</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLangOpen(o => !o)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#eeeeff', fontSize: 13, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'center' }}>
                {lang}
                <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
              </button>
              {langOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {langs.map(l => (
                    <button key={l} onClick={() => { changeLang(l); setLangOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, textAlign: 'center', cursor: 'pointer', background: l === lang ? 'rgba(6,182,212,0.15)' : 'none', color: l === lang ? '#22d3ee' : '#ccccdd', border: 'none', fontWeight: l === lang ? 700 : 400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link href="/login" style={{ fontSize: 14, color: '#8888aa', fontWeight: 600, textDecoration: 'none' }}>{tx.login}</Link>
          </div>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
            <span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600 }}>{tx.tagline}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, marginBottom: 24, whiteSpace: 'pre-line', background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {tx.hero}
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: '#8888aa', lineHeight: 1.7, marginBottom: 48, whiteSpace: 'pre-line', maxWidth: 560, margin: '0 auto 48px' }}>
            {tx.heroSub}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 16, padding: '16px 32px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }}>
              {tx.ctaStart}
            </Link>
          </div>
        </section>

        {/* Value props */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
            {(['talent', 'agency'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: tab === t ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'rgba(255,255,255,0.05)', color: tab === t ? 'white' : '#555570' }}>
                {t === 'talent' ? tx.forTalent : tx.forAgency}
              </button>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '48px 40px' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#eeeeff', marginBottom: 32, textAlign: 'center' }}>
              {tab === 'talent' ? tx.talentTitle : tx.agencyTitle}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {(tab === 'talent' ? tx.talentPoints : tx.agencyPoints).map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px', background: 'rgba(6,182,212,0.05)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.1)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 900, color: 'white' }}>{i + 1}</div>
                  <span style={{ fontSize: 15, color: '#ccccdd', lineHeight: 1.5, fontWeight: 500 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#eeeeff', marginBottom: 56 }}>{tx.howTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {tx.steps.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '32px 24px', height: '100%' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 900, color: 'white', boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>{i + 1}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#eeeeff', marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#666680', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 28, padding: '64px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: '#eeeeff', marginBottom: 12 }}>{tx.ctaTitle}</h2>
            <p style={{ fontSize: 16, color: '#22d3ee', marginBottom: 36, fontWeight: 600 }}>{tx.ctaSub}</p>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 17, padding: '18px 48px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(6,182,212,0.45)', display: 'inline-block' }}>
              {tx.ctaStart}
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(145deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: 14 }}>K</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 15 }}>Kpick</div>
                <div style={{ fontSize: 12, color: '#444460' }}>{tx.footerDesc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Link href="/login" style={{ fontSize: 13, color: '#444460', textDecoration: 'none' }}>{tx.login}</Link>
              <Link href="/signup" style={{ fontSize: 13, color: '#444460', textDecoration: 'none' }}>{tx.ctaTalent}</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
