'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LANGS, LANG_LABELS, type Lang } from '@/lib/i18n/translations'

type TxShape = {
  tagline: string; hero: string; heroSub: string; ctaTalent: string; ctaAgency: string
  login: string; forTalent: string; forAgency: string; talentTitle: string; talentPoints: string[]
  agencyTitle: string; agencyPoints: string[]; howTitle: string; steps: { title: string; desc: string }[]
  ctaTitle: string; ctaSub: string; ctaStart: string; footerDesc: string
}

const t: Record<Lang, TxShape> = {
  ko: {
    tagline: '기획사가 직접 발굴하는 오디션 플랫폼',
    hero: '당신의 재능\n기획사에게 직접',
    heroSub: '영상 하나로 전세계 기획사 담당자에게 노출됩니다.\nKpick은 오디션의 새로운 방식입니다.',
    ctaTalent: '지망생으로 시작하기', ctaAgency: '기획사 문의', login: '로그인',
    forTalent: '지망생', forAgency: '기획사',
    talentTitle: '재능을 보여줄 무대가 생겼어요',
    talentPoints: ['영상 업로드 한 번으로 전세계 기획사에 노출', '기획사가 먼저 연락해요', '오디션 공고를 한 곳에서 확인', '관심 표시와 채팅으로 바로 소통'],
    agencyTitle: '검증된 인재를 더 빠르게',
    agencyPoints: ['전세계 지망생 영상을 한 곳에서 탐색', '원하는 조건으로 필터링', '관심 표시로 풀 구성', '채팅으로 바로 연락'],
    howTitle: '이렇게 작동해요',
    steps: [{ title: '영상 업로드', desc: '보컬, 댄스, 연기 등 나의 재능을 담은 영상을 올리세요' }, { title: '기획사 탐색', desc: '전국 기획사 담당자들이 영상을 보고 관심 표시를 합니다' }, { title: '직접 연결', desc: '채팅으로 바로 소통하고 오디션 기회를 잡으세요' }],
    ctaTitle: '지금 바로 시작해보세요', ctaSub: '가입은 무료입니다', ctaStart: '무료로 시작하기',
    footerDesc: '기획사가 직접 발굴하는 오디션 플랫폼',
  },
  en: {
    tagline: 'The audition platform where agencies find you',
    hero: 'Your talent,\ndirectly to agencies',
    heroSub: 'Upload one video and get discovered by agencies across Korea.\nKpick is a new way to audition.',
    ctaTalent: 'Start as a talent', ctaAgency: 'For agencies', login: 'Log in',
    forTalent: 'Talents', forAgency: 'Agencies',
    talentTitle: 'A stage to show your talent',
    talentPoints: ['One upload, exposed to agencies nationwide', 'Agencies reach out to you first', 'All audition listings in one place', 'Communicate directly via chat'],
    agencyTitle: 'Discover talent faster',
    agencyPoints: ['Browse talent videos from across Korea', 'Filter by category and criteria', 'Build your shortlist with bookmarks', 'Reach out directly via chat'],
    howTitle: 'How it works',
    steps: [{ title: 'Upload a video', desc: 'Show your vocal, dance, acting or other talents in a short video' }, { title: 'Get discovered', desc: 'Agency scouts browse videos and bookmark the ones they like' }, { title: 'Connect directly', desc: 'Chat directly with agencies and land your audition opportunity' }],
    ctaTitle: 'Start today', ctaSub: 'Free to join', ctaStart: 'Get started free',
    footerDesc: 'The audition platform where agencies find you',
  },
  ja: {
    tagline: '芸能事務所が直接スカウトするオーディションプラットフォーム',
    hero: 'あなたの才能を\n事務所へ直接届ける',
    heroSub: '動画1本で全国の芸能事務所にアピール。\nKpickは新しいオーディションのかたちです。',
    ctaTalent: 'タレントとして始める', ctaAgency: '事務所の方はこちら', login: 'ログイン',
    forTalent: 'タレント', forAgency: '事務所',
    talentTitle: '才能を見せる舞台が生まれた',
    talentPoints: ['動画1本で全国の事務所に露出', '事務所から直接連絡が来る', 'オーディション情報を一括確認', 'チャットで直接コミュニケーション'],
    agencyTitle: '優秀な人材をより早く発掘',
    agencyPoints: ['全国のタレント動画を一覧で閲覧', '条件でフィルタリング', 'お気に入り登録でリスト管理', 'チャットで直接連絡'],
    howTitle: '使い方',
    steps: [{ title: '動画をアップロード', desc: 'ボーカル、ダンス、演技など自分の才能を動画で投稿' }, { title: '事務所に発見される', desc: '全国の芸能事務所のスカウトが動画を閲覧し、お気に入り登録' }, { title: '直接つながる', desc: 'チャットで事務所と直接やり取りし、チャンスをつかもう' }],
    ctaTitle: '今すぐ始めよう', ctaSub: '登録無料', ctaStart: '無料で始める',
    footerDesc: '芸能事務所が直接スカウトするオーディションプラットフォーム',
  },
  zh: {
    tagline: '经纪公司直接发掘人才的试镜平台',
    hero: '你的才华\n直达经纪公司',
    heroSub: '上传一个视频，让全国经纪公司发现你。\nKpick是全新的试镜方式。',
    ctaTalent: '以艺人身份开始', ctaAgency: '经纪公司咨询', login: '登录',
    forTalent: '艺人', forAgency: '经纪公司',
    talentTitle: '展示才华的舞台',
    talentPoints: ['上传一次视频，曝光给全国经纪公司', '经纪公司主动联系你', '在一处查看所有试镜公告', '通过聊天直接沟通'],
    agencyTitle: '更快发掘优秀人才',
    agencyPoints: ['在一处浏览全国艺人视频', '按条件筛选', '通过收藏建立人才库', '直接通过聊天联系'],
    howTitle: '使用方式',
    steps: [{ title: '上传视频', desc: '上传展示你的声乐、舞蹈、表演等才华的视频' }, { title: '被经纪公司发现', desc: '全国经纪公司的星探浏览视频并收藏感兴趣的人才' }, { title: '直接建立联系', desc: '通过聊天直接与经纪公司沟通，把握试镜机会' }],
    ctaTitle: '立即开始', ctaSub: '注册免费', ctaStart: '免费开始',
    footerDesc: '经纪公司直接发掘人才的试镜平台',
  },
  'zh-TW': {
    tagline: '經紀公司直接發掘人才的試鏡平台',
    hero: '你的才華\n直達經紀公司',
    heroSub: '上傳一個影片，讓全國經紀公司發現你。\nKpick是全新的試鏡方式。',
    ctaTalent: '以藝人身份開始', ctaAgency: '經紀公司諮詢', login: '登入',
    forTalent: '藝人', forAgency: '經紀公司',
    talentTitle: '展示才華的舞台',
    talentPoints: ['上傳一次影片，曝光給全國經紀公司', '經紀公司主動聯繫你', '在一處查看所有試鏡公告', '透過聊天直接溝通'],
    agencyTitle: '更快發掘優秀人才',
    agencyPoints: ['在一處瀏覽全國藝人影片', '按條件篩選', '透過收藏建立人才庫', '直接透過聊天聯繫'],
    howTitle: '使用方式',
    steps: [{ title: '上傳影片', desc: '上傳展示你的聲樂、舞蹈、表演等才華的影片' }, { title: '被經紀公司發現', desc: '全國經紀公司的星探瀏覽影片並收藏感興趣的人才' }, { title: '直接建立聯繫', desc: '透過聊天直接與經紀公司溝通，把握試鏡機會' }],
    ctaTitle: '立即開始', ctaSub: '註冊免費', ctaStart: '免費開始',
    footerDesc: '經紀公司直接發掘人才的試鏡平台',
  },
  th: {
    tagline: 'แพลตฟอร์มออดิชันที่ค่ายเพลงค้นหาคุณเอง',
    hero: 'พรสวรรค์ของคุณ\nถึงมือค่ายเพลงโดยตรง',
    heroSub: 'อัปโหลดวิดีโอเดียว แล้วให้ค่ายเพลงทั่วประเทศค้นพบคุณ\nKpick คือวิธีออดิชันแบบใหม่',
    ctaTalent: 'เริ่มต้นในฐานะศิลปิน', ctaAgency: 'สำหรับค่ายเพลง', login: 'เข้าสู่ระบบ',
    forTalent: 'ศิลปิน', forAgency: 'ค่ายเพลง',
    talentTitle: 'เวทีแสดงพรสวรรค์ของคุณ',
    talentPoints: ['อัปโหลดครั้งเดียว เข้าถึงค่ายเพลงทั่วประเทศ', 'ค่ายเพลงติดต่อคุณก่อน', 'ดูประกาศออดิชันทุกที่ในที่เดียว', 'สื่อสารโดยตรงผ่านแชท'],
    agencyTitle: 'ค้นหาพรสวรรค์ได้เร็วขึ้น',
    agencyPoints: ['เรียกดูวิดีโอของศิลปินทั่วประเทศ', 'กรองตามเงื่อนไขที่ต้องการ', 'สร้างรายชื่อด้วยการบุ๊กมาร์ก', 'ติดต่อโดยตรงผ่านแชท'],
    howTitle: 'วิธีการใช้งาน',
    steps: [{ title: 'อัปโหลดวิดีโอ', desc: 'แสดงความสามารถด้านร้อง เต้น แสดง หรืออื่นๆ ในวิดีโอสั้น' }, { title: 'ถูกค้นพบ', desc: 'ผู้สรรหาจากค่ายเพลงเรียกดูวิดีโอและบุ๊กมาร์กที่สนใจ' }, { title: 'เชื่อมต่อโดยตรง', desc: 'แชทกับค่ายเพลงโดยตรงและคว้าโอกาสออดิชัน' }],
    ctaTitle: 'เริ่มต้นวันนี้เลย', ctaSub: 'สมัครฟรี', ctaStart: 'เริ่มต้นฟรี',
    footerDesc: 'แพลตฟอร์มออดิชันที่ค่ายเพลงค้นหาคุณเอง',
  },
  id: {
    tagline: 'Platform audisi tempat agensi menemukan kamu',
    hero: 'Bakatmu,\nlangsung ke agensi',
    heroSub: 'Upload satu video dan ditemukan oleh agensi di seluruh dunia.\nKpick adalah cara baru untuk audisi.',
    ctaTalent: 'Mulai sebagai bakat', ctaAgency: 'Untuk agensi', login: 'Masuk',
    forTalent: 'Bakat', forAgency: 'Agensi',
    talentTitle: 'Panggung untuk bakatmu',
    talentPoints: ['Satu upload, terekspos ke semua agensi', 'Agensi yang menghubungimu duluan', 'Semua lowongan audisi di satu tempat', 'Komunikasi langsung lewat chat'],
    agencyTitle: 'Temukan bakat lebih cepat',
    agencyPoints: ['Jelajahi video bakat dari seluruh dunia', 'Filter sesuai kriteria', 'Buat daftar favorit dengan bookmark', 'Hubungi langsung lewat chat'],
    howTitle: 'Cara kerjanya',
    steps: [{ title: 'Upload video', desc: 'Tunjukkan bakat vokal, tari, akting atau lainnya dalam video singkat' }, { title: 'Ditemukan agensi', desc: 'Scout dari agensi menjelajahi video dan mem-bookmark yang mereka suka' }, { title: 'Terhubung langsung', desc: 'Chat langsung dengan agensi dan raih kesempatan audisi' }],
    ctaTitle: 'Mulai hari ini', ctaSub: 'Gratis untuk bergabung', ctaStart: 'Mulai gratis',
    footerDesc: 'Platform audisi tempat agensi menemukan kamu',
  },
  vi: {
    tagline: 'Nền tảng thử vai nơi các công ty phát hiện bạn',
    hero: 'Tài năng của bạn,\ntrực tiếp đến công ty',
    heroSub: 'Tải lên một video và được các công ty phát hiện.\nKpick là cách thử vai mới.',
    ctaTalent: 'Bắt đầu với tư cách nghệ sĩ', ctaAgency: 'Dành cho công ty', login: 'Đăng nhập',
    forTalent: 'Nghệ sĩ', forAgency: 'Công ty',
    talentTitle: 'Sân khấu để thể hiện tài năng',
    talentPoints: ['Một lần tải lên, tiếp cận tất cả công ty', 'Công ty chủ động liên hệ bạn', 'Tất cả thông báo thử vai ở một nơi', 'Giao tiếp trực tiếp qua chat'],
    agencyTitle: 'Tìm kiếm tài năng nhanh hơn',
    agencyPoints: ['Duyệt video nghệ sĩ từ khắp nơi', 'Lọc theo tiêu chí', 'Tạo danh sách yêu thích', 'Liên hệ trực tiếp qua chat'],
    howTitle: 'Cách thức hoạt động',
    steps: [{ title: 'Tải lên video', desc: 'Thể hiện tài năng thanh nhạc, nhảy, diễn xuất trong video ngắn' }, { title: 'Được phát hiện', desc: 'Các nhà tuyển dụng duyệt video và đánh dấu những người họ thích' }, { title: 'Kết nối trực tiếp', desc: 'Chat trực tiếp với công ty và nắm bắt cơ hội thử vai' }],
    ctaTitle: 'Bắt đầu ngay hôm nay', ctaSub: 'Miễn phí để đăng ký', ctaStart: 'Bắt đầu miễn phí',
    footerDesc: 'Nền tảng thử vai nơi các công ty phát hiện bạn',
  },
  tl: {
    tagline: 'Ang platform ng audisyon kung saan hinahanap ka ng mga ahensya',
    hero: 'Ang iyong talento,\ndiretso sa mga ahensya',
    heroSub: 'Mag-upload ng isang video at matuklasan ng mga ahensya sa buong mundo.\nAng Kpick ay isang bagong paraan ng audisyon.',
    ctaTalent: 'Magsimula bilang artista', ctaAgency: 'Para sa mga ahensya', login: 'Mag-login',
    forTalent: 'Mga Artista', forAgency: 'Mga Ahensya',
    talentTitle: 'Isang entablado para ipakita ang iyong talento',
    talentPoints: ['Isang upload, nalantad sa lahat ng ahensya', 'Ang mga ahensya ang makikipag-ugnayan muna', 'Lahat ng audisyon sa isang lugar', 'Direktang komunikasyon sa pamamagitan ng chat'],
    agencyTitle: 'Mas mabilis na matuklasan ang talento',
    agencyPoints: ['I-browse ang mga video ng artista', 'I-filter ayon sa pamantayan', 'Gumawa ng shortlist gamit ang bookmark', 'Makipag-ugnayan nang direkta sa chat'],
    howTitle: 'Paano ito gumagana',
    steps: [{ title: 'Mag-upload ng video', desc: 'Ipakita ang iyong talento sa pagkanta, sayaw, o pag-arte' }, { title: 'Matuklasan', desc: 'Ang mga scout ng ahensya ay nagba-browse at nagbu-bookmark ng kanilang nagugustuhan' }, { title: 'Direktang kumonekta', desc: 'Chat nang direkta sa mga ahensya at makuha ang pagkakataon sa audisyon' }],
    ctaTitle: 'Magsimula ngayon', ctaSub: 'Libre ang pagsali', ctaStart: 'Magsimulang libre',
    footerDesc: 'Ang platform ng audisyon kung saan hinahanap ka ng mga ahensya',
  },
  es: {
    tagline: 'La plataforma de audiciones donde las agencias te encuentran',
    hero: 'Tu talento,\ndirectamente a las agencias',
    heroSub: 'Sube un video y deja que las agencias de todo el mundo te descubran.\nKpick es una nueva forma de hacer audiciones.',
    ctaTalent: 'Empezar como talento', ctaAgency: 'Para agencias', login: 'Iniciar sesión',
    forTalent: 'Artistas', forAgency: 'Agencias',
    talentTitle: 'Un escenario para mostrar tu talento',
    talentPoints: ['Una subida, expuesto a todas las agencias', 'Las agencias te contactan primero', 'Todas las audiciones en un lugar', 'Comunicación directa por chat'],
    agencyTitle: 'Descubre talento más rápido',
    agencyPoints: ['Explora videos de talentos de todo el mundo', 'Filtra por criterios', 'Crea tu lista con marcadores', 'Contáctate directamente por chat'],
    howTitle: 'Cómo funciona',
    steps: [{ title: 'Sube un video', desc: 'Muestra tu talento vocal, de baile, actuación u otros en un video corto' }, { title: 'Sé descubierto', desc: 'Los scouts de las agencias exploran videos y marcan los que les gustan' }, { title: 'Conéctate directamente', desc: 'Chatea directamente con las agencias y consigue tu oportunidad de audición' }],
    ctaTitle: 'Empieza hoy', ctaSub: 'Gratis para unirse', ctaStart: 'Empezar gratis',
    footerDesc: 'La plataforma de audiciones donde las agencias te encuentran',
  },
}

export default function LandingClient() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('kpick-lang')
      return (LANGS as readonly string[]).includes(saved ?? '') ? saved as Lang : 'ko'
    } catch { return 'ko' }
  })
  const [tab, setTab] = useState<'talent' | 'agency'>('talent')
  const [ready, setReady] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const tx = t[lang]

  function changeLang(l: Lang) {
    setLang(l)
    try { localStorage.setItem('kpick-lang', l) } catch {}
  }

  useEffect(() => {
    if (!langOpen) return
    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) { window.location.replace(`/auth/callback?code=${code}`); return }

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
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(145deg, #001a20, #0a3d4a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="23" height="23" viewBox="0 0 100 100">
                <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#06b6d4" />
                <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#06b6d4" />
                <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(6,182,212,0.8)" />
              </svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#eeeeff' }}>Kpick</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLangOpen(o => !o)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#eeeeff', fontSize: 13, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 88, WebkitAppearance: 'none', appearance: 'none' }}>
                <span style={{ width: 14, flexShrink: 0 }} />
                <span>{LANG_LABELS[lang]}</span>
                <span style={{ width: 14, flexShrink: 0, fontSize: 10, opacity: 0.5, textAlign: 'right' }}>▼</span>
              </button>
              {langOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {LANGS.map(l => (
                    <button key={l} onClick={() => { changeLang(l); setLangOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, textAlign: 'center', cursor: 'pointer', background: l === lang ? 'rgba(6,182,212,0.15)' : 'none', color: l === lang ? '#22d3ee' : '#ccccdd', border: 'none', fontWeight: l === lang ? 700 : 400 }}>
                      {LANG_LABELS[l]}
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
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: '#8888aa', lineHeight: 1.7, marginBottom: 48, whiteSpace: 'pre-line', wordBreak: 'keep-all', maxWidth: 560, margin: '0 auto 48px' }}>
            {tx.heroSub}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 16, padding: '16px 32px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }}>
              {tx.ctaStart}
            </Link>
          </div>

          {/* 소셜 프루프 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '8px 18px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
              <span style={{ fontSize: 13, color: '#aaaacc', fontWeight: 600 }}>16개 기획사 참여 중</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '8px 18px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>FNC엔터테인먼트 최종 오디션 <strong>2명</strong> 진행 중</span>
            </div>
          </div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
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
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#eeeeff', marginBottom: 32, textAlign: 'center', wordBreak: 'keep-all' }}>
              {tab === 'talent' ? tx.talentTitle : tx.agencyTitle}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {(tab === 'talent' ? tx.talentPoints : tx.agencyPoints).map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px', background: 'rgba(6,182,212,0.05)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.1)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 900, color: 'white' }}>{i + 1}</div>
                  <span style={{ fontSize: 15, color: '#ccccdd', lineHeight: 1.5, fontWeight: 500, wordBreak: 'keep-all' }}>{point}</span>
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
            <h2 style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: '#eeeeff', marginBottom: 12, wordBreak: 'keep-all' }}>{tx.ctaTitle}</h2>
            <p style={{ fontSize: 16, color: '#22d3ee', marginBottom: 36, fontWeight: 600 }}>{tx.ctaSub}</p>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 17, padding: '18px 48px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(6,182,212,0.45)', display: 'inline-block' }}>
              {tx.ctaStart}
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(145deg, #001a20, #0a3d4a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 100 100">
                  <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#06b6d4" />
                  <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#06b6d4" />
                  <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(6,182,212,0.8)" />
                </svg>
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
