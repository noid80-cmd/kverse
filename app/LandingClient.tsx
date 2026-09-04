'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isNativeAppAsync } from '@/lib/capacitor'
import Link from 'next/link'
import { LANGS, LANG_LABELS, type Lang } from '@/lib/i18n/translations'
import LiveTicker from '@/components/LiveTicker'
import AuditionCountdown from '@/components/AuditionCountdown'
import WelcomeCarousel from '@/components/WelcomeCarousel'

type TxShape = {
  tagline: string; hero: string; heroSub: string; ctaTalent: string; ctaAgency: string
  login: string; forTalent: string; forAgency: string; talentTitle: string; talentPoints: string[]
  agencyTitle: string; agencyPoints: string[]; howTitle: string; steps: { title: string; desc: string }[]
  ctaTitle: string; ctaSub: string; ctaStart: string; footerDesc: string
}

// LIVE 티커. 실적이 쌓이면 그 숫자를 쓰고, 없으면 지금 사실을 그대로 쓴다.
// 문구를 언어별로 통째로 들고 있으면 숫자가 바뀔 때마다 열 줄을 고쳐야 하므로
// {agency}/{n} 자리를 비워둔 틀로 둔다.
export type LiveStats = {
  topAgency?: string
  topAgencyCount?: number
  activeAgencies?: number
}

const TICKER: Record<Lang, { result: string; agencies: string }> = {
  ko:      { result: '{agency} 최종 합격자 {n}명 배출', agencies: '{n}개 기획사 참여 중' },
  en:      { result: '{n} final picks at {agency}', agencies: '{n} agencies taking part' },
  ja:      { result: '{agency}最終合格者{n}名', agencies: '{n}社の事務所が参加中' },
  zh:      { result: '{agency}最终合格者{n}名', agencies: '{n}家经纪公司参与中' },
  'zh-TW': { result: '{agency}最終合格者{n}名', agencies: '{n}家經紀公司參與中' },
  th:      { result: 'ผ่านรอบสุดท้ายที่ {agency} {n} คน', agencies: '{n} ค่ายเข้าร่วม' },
  id:      { result: '{n} lolos final di {agency}', agencies: '{n} agensi ikut serta' },
  vi:      { result: '{n} người trúng tuyển tại {agency}', agencies: '{n} công ty đang tham gia' },
  tl:      { result: '{n} ang pumasa sa final sa {agency}', agencies: '{n} ahensya ang kalahok' },
  es:      { result: '{n} seleccionados finales en {agency}', agencies: '{n} agencias participando' },
}

// 실적이 아직 없을 때 쓰는 값. 사실이라서 그대로 두고, 데이터가 들어오면
// 자동으로 갈린다.
const TICKER_FALLBACK = { agency: 'FNC엔터테인먼트', count: 2, agencies: 16 }

function fillTicker(lang: Lang, stats: LiveStats) {
  const tpl = TICKER[lang]
  const agency = stats.topAgency ?? TICKER_FALLBACK.agency
  const count = stats.topAgencyCount ?? TICKER_FALLBACK.count
  const agencies = stats.activeAgencies ?? TICKER_FALLBACK.agencies
  return {
    result: tpl.result.replace('{agency}', agency).replace('{n}', String(count)),
    agencies: tpl.agencies.replace('{n}', String(agencies)),
  }
}

const t: Record<Lang, TxShape> = {
  ko: {
    tagline: '매주 새로운 오디션에 지원하세요',
    hero: '매주 새로운 오디션\n영상 하나로 지원',
    heroSub: '기획사가 직접 여는 온라인 오디션.\n갖고 있는 영상으로 지원하고 결과는 앱에서 받아보세요.',
    ctaTalent: '지망생으로 시작하기', ctaAgency: '기획사 문의', login: '로그인',
    forTalent: '지망생', forAgency: '기획사',
    talentTitle: '오디션을 찾아다니지 않아도 돼요',
    talentPoints: ['매주 새로운 기획사 오디션이 열려요', '갖고 있는 영상으로 바로 지원 — 새로 찍지 않아도 돼요', '결과는 앱으로 알려드려요', '평소엔 커버 영상을 올려두면 기획사가 먼저 찾아와요'],
    agencyTitle: '검증된 인재를 더 빠르게',
    agencyPoints: ['온라인 오디션을 열고 지원 영상을 한 곳에서', '전세계 지망생 커버 영상 탐색', '원하는 조건으로 필터링', '채팅으로 바로 연락'],
    howTitle: '이렇게 지원해요',
    steps: [{ title: '이번 주 오디션 확인', desc: '매주 새로운 기획사 오디션이 올라와요' }, { title: '영상으로 지원', desc: '갖고 있는 영상을 고르거나 새로 찍어서 바로 지원하세요' }, { title: '결과 확인', desc: '기획사가 확인하면 앱으로 알려드려요' }],
    ctaTitle: '이번 주 오디션에 지원하세요', ctaSub: '가입은 무료입니다', ctaStart: '무료로 시작하기',
    footerDesc: '매주 새로운 오디션에 지원하세요',
  },
  en: {
    tagline: 'Apply to a new audition every week',
    hero: 'A new audition\nevery week',
    heroSub: 'Online auditions held by real agencies.\nApply with a video you already have — results come to the app.',
    ctaTalent: 'Start as a talent', ctaAgency: 'For agencies', login: 'Log in',
    forTalent: 'Talents', forAgency: 'Agencies',
    talentTitle: 'No more hunting for auditions',
    talentPoints: ['A new agency audition opens every week', 'Apply with a video you already have — no new filming', 'Results come straight to the app', 'Post covers anytime and let agencies find you'],
    agencyTitle: 'Find talent faster',
    agencyPoints: ['Open an online audition and collect every entry in one place', 'Browse cover videos from around the world', 'Filter by what you are looking for', 'Reach out directly via chat'],
    howTitle: 'How to apply',
    steps: [{ title: 'Check this week’s audition', desc: 'A new agency audition opens every week' }, { title: 'Apply with a video', desc: 'Pick a video you already have, or film a new one' }, { title: 'Hear back', desc: 'You will be notified in the app once the agency reviews it' }],
    ctaTitle: 'Apply to this week’s audition', ctaSub: 'Free to join', ctaStart: 'Get started free',
    footerDesc: 'Apply to a new audition every week',
  },
  ja: {
    tagline: '毎週新しいオーディションに応募しよう',
    hero: '毎週新しいオーディション\n動画1本で応募',
    heroSub: '芸能事務所が直接開催するオンラインオーディション。\n手持ちの動画で応募して、結果はアプリで受け取れます。',
    ctaTalent: 'タレントとして始める', ctaAgency: '事務所の方はこちら', login: 'ログイン',
    forTalent: 'タレント', forAgency: '事務所',
    talentTitle: 'オーディションを探し回らなくていい',
    talentPoints: ['毎週新しい事務所オーディションが開催', '手持ちの動画でそのまま応募 — 撮り直し不要', '結果はアプリでお知らせ', '普段はカバー動画を上げておけば事務所から声がかかります'],
    agencyTitle: '優秀な人材をより早く発掘',
    agencyPoints: ['オンラインオーディションを開催し応募動画を一括管理', '世界中のカバー動画を閲覧', '条件でフィルタリング', 'チャットで直接連絡'],
    howTitle: '応募の流れ',
    steps: [{ title: '今週のオーディションを確認', desc: '毎週新しい事務所オーディションが公開されます' }, { title: '動画で応募', desc: '手持ちの動画を選ぶか、新しく撮って応募' }, { title: '結果を確認', desc: '事務所が確認するとアプリでお知らせします' }],
    ctaTitle: '今週のオーディションに応募', ctaSub: '登録無料', ctaStart: '無料で始める',
    footerDesc: '毎週新しいオーディションに応募しよう',
  },
  zh: {
    tagline: '每周都有新试镜等你报名',
    hero: '每周都有新试镜\n一个视频即可报名',
    heroSub: '经纪公司亲自举办的线上试镜。\n用你现有的视频报名，结果直接在应用内查收。',
    ctaTalent: '以艺人身份开始', ctaAgency: '经纪公司咨询', login: '登录',
    forTalent: '艺人', forAgency: '经纪公司',
    talentTitle: '不用再到处找试镜',
    talentPoints: ['每周都有新的经纪公司试镜', '用现有视频直接报名 — 无需重新拍摄', '结果通过应用通知你', '平时上传翻唱视频，让经纪公司主动找到你'],
    agencyTitle: '更快发掘优秀人才',
    agencyPoints: ['开设线上试镜，在一处收齐所有报名视频', '浏览全球艺人的翻唱视频', '按条件筛选', '通过聊天直接联系'],
    howTitle: '报名方式',
    steps: [{ title: '查看本周试镜', desc: '每周都有新的经纪公司试镜发布' }, { title: '用视频报名', desc: '选择现有视频，或重新拍一个' }, { title: '查看结果', desc: '经纪公司确认后会通过应用通知你' }],
    ctaTitle: '报名本周试镜', ctaSub: '注册免费', ctaStart: '免费开始',
    footerDesc: '每周都有新试镜等你报名',
  },
  'zh-TW': {
    tagline: '每週都有新試鏡等你報名',
    hero: '每週都有新試鏡\n一支影片即可報名',
    heroSub: '經紀公司親自舉辦的線上試鏡。\n用你現有的影片報名，結果直接在應用程式內查收。',
    ctaTalent: '以藝人身份開始', ctaAgency: '經紀公司諮詢', login: '登入',
    forTalent: '藝人', forAgency: '經紀公司',
    talentTitle: '不用再到處找試鏡',
    talentPoints: ['每週都有新的經紀公司試鏡', '用現有影片直接報名 — 無需重新拍攝', '結果透過應用程式通知你', '平時上傳翻唱影片，讓經紀公司主動找到你'],
    agencyTitle: '更快發掘優秀人才',
    agencyPoints: ['開設線上試鏡，在一處收齊所有報名影片', '瀏覽全球藝人的翻唱影片', '按條件篩選', '透過聊天直接聯繫'],
    howTitle: '報名方式',
    steps: [{ title: '查看本週試鏡', desc: '每週都有新的經紀公司試鏡發布' }, { title: '用影片報名', desc: '選擇現有影片，或重新拍一支' }, { title: '查看結果', desc: '經紀公司確認後會透過應用程式通知你' }],
    ctaTitle: '報名本週試鏡', ctaSub: '註冊免費', ctaStart: '免費開始',
    footerDesc: '每週都有新試鏡等你報名',
  },
  th: {
    tagline: 'สมัครออดิชันใหม่ได้ทุกสัปดาห์',
    hero: 'ออดิชันใหม่ทุกสัปดาห์\nสมัครด้วยวิดีโอเดียว',
    heroSub: 'ออดิชันออนไลน์ที่ค่ายเพลงจัดขึ้นเอง\nสมัครด้วยวิดีโอที่คุณมีอยู่แล้ว และรับผลผ่านแอป',
    ctaTalent: 'เริ่มต้นในฐานะนักออดิชัน', ctaAgency: 'สำหรับค่ายเพลง', login: 'เข้าสู่ระบบ',
    forTalent: 'นักออดิชัน', forAgency: 'ค่ายเพลง',
    talentTitle: 'ไม่ต้องตามหาออดิชันอีกต่อไป',
    talentPoints: ['มีออดิชันจากค่ายใหม่ทุกสัปดาห์', 'สมัครด้วยวิดีโอที่มีอยู่ — ไม่ต้องถ่ายใหม่', 'รับผลผ่านแอปโดยตรง', 'อัปโหลดวิดีโอคัฟเวอร์ไว้ แล้วให้ค่ายมาหาคุณเอง'],
    agencyTitle: 'ค้นหาผู้มีความสามารถได้เร็วขึ้น',
    agencyPoints: ['เปิดออดิชันออนไลน์และรวบรวมใบสมัครในที่เดียว', 'ดูวิดีโอคัฟเวอร์จากทั่วโลก', 'กรองตามเงื่อนไขที่ต้องการ', 'ติดต่อโดยตรงผ่านแชท'],
    howTitle: 'วิธีสมัคร',
    steps: [{ title: 'ดูออดิชันประจำสัปดาห์', desc: 'มีออดิชันจากค่ายใหม่เปิดทุกสัปดาห์' }, { title: 'สมัครด้วยวิดีโอ', desc: 'เลือกวิดีโอที่คุณมีอยู่ หรือถ่ายใหม่' }, { title: 'ดูผลลัพธ์', desc: 'เมื่อค่ายตรวจสอบแล้ว เราจะแจ้งให้ทราบผ่านแอป' }],
    ctaTitle: 'สมัครออดิชันสัปดาห์นี้', ctaSub: 'สมัครฟรี', ctaStart: 'เริ่มต้นฟรี',
    footerDesc: 'สมัครออดิชันใหม่ได้ทุกสัปดาห์',
  },
  id: {
    tagline: 'Ikuti audisi baru setiap minggu',
    hero: 'Audisi baru\nsetiap minggu',
    heroSub: 'Audisi online yang digelar langsung oleh agensi.\nDaftar dengan video yang sudah kamu punya, hasilnya masuk ke aplikasi.',
    ctaTalent: 'Mulai sebagai talenta', ctaAgency: 'Untuk agensi', login: 'Masuk',
    forTalent: 'Talenta', forAgency: 'Agensi',
    talentTitle: 'Tak perlu lagi mencari-cari audisi',
    talentPoints: ['Audisi agensi baru dibuka setiap minggu', 'Daftar dengan video yang sudah ada — tanpa syuting ulang', 'Hasilnya langsung masuk ke aplikasi', 'Unggah video cover kapan saja dan biarkan agensi menemukanmu'],
    agencyTitle: 'Temukan talenta lebih cepat',
    agencyPoints: ['Buka audisi online dan kumpulkan semua pendaftaran di satu tempat', 'Jelajahi video cover dari seluruh dunia', 'Saring sesuai kebutuhan', 'Hubungi langsung lewat chat'],
    howTitle: 'Cara mendaftar',
    steps: [{ title: 'Cek audisi minggu ini', desc: 'Audisi agensi baru dibuka setiap minggu' }, { title: 'Daftar dengan video', desc: 'Pilih video yang sudah kamu punya, atau rekam yang baru' }, { title: 'Lihat hasilnya', desc: 'Kami beri tahu lewat aplikasi setelah agensi meninjau' }],
    ctaTitle: 'Ikuti audisi minggu ini', ctaSub: 'Gratis untuk bergabung', ctaStart: 'Mulai gratis',
    footerDesc: 'Ikuti audisi baru setiap minggu',
  },
  vi: {
    tagline: 'Ứng tuyển thử vai mới mỗi tuần',
    hero: 'Thử vai mới\nmỗi tuần',
    heroSub: 'Buổi thử vai trực tuyến do chính công ty giải trí tổ chức.\nỨng tuyển bằng video bạn đã có, kết quả gửi thẳng vào ứng dụng.',
    ctaTalent: 'Bắt đầu với tư cách thí sinh', ctaAgency: 'Dành cho công ty', login: 'Đăng nhập',
    forTalent: 'Thí sinh', forAgency: 'Công ty',
    talentTitle: 'Không phải đi tìm buổi thử vai nữa',
    talentPoints: ['Mỗi tuần có một buổi thử vai mới', 'Ứng tuyển bằng video sẵn có — không cần quay lại', 'Kết quả được báo ngay trên ứng dụng', 'Đăng video cover và để các công ty tự tìm đến bạn'],
    agencyTitle: 'Tìm nhân tài nhanh hơn',
    agencyPoints: ['Mở buổi thử vai trực tuyến và gom toàn bộ hồ sơ về một nơi', 'Xem video cover từ khắp thế giới', 'Lọc theo tiêu chí bạn cần', 'Liên hệ trực tiếp qua trò chuyện'],
    howTitle: 'Cách ứng tuyển',
    steps: [{ title: 'Xem buổi thử vai tuần này', desc: 'Mỗi tuần có một buổi thử vai mới được đăng' }, { title: 'Ứng tuyển bằng video', desc: 'Chọn video bạn đã có, hoặc quay video mới' }, { title: 'Nhận kết quả', desc: 'Chúng tôi sẽ báo trên ứng dụng khi công ty xem xong' }],
    ctaTitle: 'Ứng tuyển buổi thử vai tuần này', ctaSub: 'Tham gia miễn phí', ctaStart: 'Bắt đầu miễn phí',
    footerDesc: 'Ứng tuyển thử vai mới mỗi tuần',
  },
  tl: {
    tagline: 'Mag-apply sa bagong audisyon kada linggo',
    hero: 'Bagong audisyon\nkada linggo',
    heroSub: 'Online na audisyon na mismong binubuksan ng mga ahensya.\nMag-apply gamit ang video na meron ka na — dadating ang resulta sa app.',
    ctaTalent: 'Magsimula bilang talento', ctaAgency: 'Para sa mga ahensya', login: 'Mag-log in',
    forTalent: 'Talento', forAgency: 'Ahensya',
    talentTitle: 'Hindi na kailangang maghanap ng audisyon',
    talentPoints: ['May bagong audisyon ng ahensya kada linggo', 'Mag-apply gamit ang video na meron ka na — hindi na kailangang mag-shoot ulit', 'Dadating ang resulta mismo sa app', 'Mag-post ng cover kahit kailan at hayaang mahanap ka ng mga ahensya'],
    agencyTitle: 'Mas mabilis na makahanap ng talento',
    agencyPoints: ['Magbukas ng online audisyon at tipunin ang lahat ng entry sa isang lugar', 'Mag-browse ng cover videos mula sa buong mundo', 'I-filter ayon sa hinahanap mo', 'Direktang makipag-ugnayan sa chat'],
    howTitle: 'Paano mag-apply',
    steps: [{ title: 'Tingnan ang audisyon ngayong linggo', desc: 'May bagong audisyon ng ahensya kada linggo' }, { title: 'Mag-apply gamit ang video', desc: 'Pumili ng video na meron ka na, o kumuha ng bago' }, { title: 'Alamin ang resulta', desc: 'Aabisuhan ka namin sa app kapag natingnan na ng ahensya' }],
    ctaTitle: 'Mag-apply sa audisyon ngayong linggo', ctaSub: 'Libre ang pagsali', ctaStart: 'Magsimula nang libre',
    footerDesc: 'Mag-apply sa bagong audisyon kada linggo',
  },
  es: {
    tagline: 'Postúlate a una nueva audición cada semana',
    hero: 'Una nueva audición\ncada semana',
    heroSub: 'Audiciones en línea organizadas por las propias agencias.\nPostúlate con un video que ya tienes y recibe el resultado en la app.',
    ctaTalent: 'Empezar como talento', ctaAgency: 'Para agencias', login: 'Iniciar sesión',
    forTalent: 'Artistas', forAgency: 'Agencias',
    talentTitle: 'Ya no tienes que buscar audiciones',
    talentPoints: ['Cada semana se abre una nueva audición de agencia', 'Postúlate con un video que ya tienes — sin grabar de nuevo', 'El resultado te llega a la app', 'Sube covers cuando quieras y deja que las agencias te encuentren'],
    agencyTitle: 'Descubre talento más rápido',
    agencyPoints: ['Abre una audición en línea y reúne todas las postulaciones en un lugar', 'Explora videos de covers de todo el mundo', 'Filtra según lo que buscas', 'Contáctate directamente por chat'],
    howTitle: 'Cómo postularse',
    steps: [{ title: 'Mira la audición de esta semana', desc: 'Cada semana se publica una nueva audición de agencia' }, { title: 'Postúlate con un video', desc: 'Elige un video que ya tienes o graba uno nuevo' }, { title: 'Recibe el resultado', desc: 'Te avisamos en la app cuando la agencia lo revise' }],
    ctaTitle: 'Postúlate a la audición de esta semana', ctaSub: 'Gratis para unirse', ctaStart: 'Empezar gratis',
    footerDesc: 'Postúlate a una nueva audición cada semana',
  },
}

export default function LandingClient({ stats = {} }: { stats?: LiveStats }) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('kpick-lang')
      return (LANGS as readonly string[]).includes(saved ?? '') ? saved as Lang : 'ko'
    } catch { return 'ko' }
  })
  const [tab, setTab] = useState<'talent' | 'agency'>('talent')
  const [ready, setReady] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const tx = t[lang]
  const ticker = fillTicker(lang, stats)

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

    // 네이티브 앱(WKWebView)은 콜드 스타트 직후 쿠키 저장소가 아직 다
    // 로드되지 않은 상태에서 getSession()이 먼저 호출되는 경우가 있어,
    // 실제로는 로그인되어 있는데도 "세션 없음"으로 읽혀 /signup으로
    // 튕기는 문제(체감상 "로그인이 자꾸 풀림")가 있었음. 재시도로 완화.
    async function resolveSession(isStandaloneApp: boolean, retriesLeft: number): Promise<void> {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) {
        if (isStandaloneApp && retriesLeft > 0) {
          await new Promise(r => setTimeout(r, 400))
          return resolveSession(isStandaloneApp, retriesLeft - 1)
        }
        if (isStandaloneApp) {
          // 홈 화면에 설치된 스탠드얼론 앱을 실행할 수 있다는 건 이미 웹에서
          // 가입+온보딩을 거쳤다는 뜻 — "세션 없음"은 거의 항상 진짜 신규
          // 유저가 아니라 기기 저장소(쿠키/localStorage)가 리셋된 기존
          // 유저다. localStorage 플래그로 구분하려 했었지만 그 저장소 자체가
          // 같이 날아가는 게 문제라 신뢰할 수 없음(admin 계정이 /signup으로
          // 튕긴 사례로 확인) — 한 번이라도 로그인한 적 있으면 항상 로그인
          // 화면으로 보낸다.
          let hasLoggedInBefore = false
          try { hasLoggedInBefore = localStorage.getItem('kpick-has-logged-in') === '1' } catch { /* non-critical */ }
          if (hasLoggedInBefore) { router.push('/login'); return }

          // 진짜 처음 실행하는 신규 유저에게는 지망생/기획사 선택 화면으로
          // 바로 보내기 전에, 스와이프형 소개 슬라이드를 한 번은 보여준다.
          // 이미 한 번 봤으면 이후로는 바로 가입 화면으로.
          let seenLanding = false
          try { seenLanding = localStorage.getItem('kpick-seen-landing') === '1' } catch { /* non-critical */ }
          if (seenLanding) { router.push('/signup'); return }
          try { localStorage.setItem('kpick-seen-landing', '1') } catch { /* non-critical */ }
          setShowWelcome(true)
          return
        }
        setReady(true); return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role ?? 'talent'
      if (role === 'admin') router.push('/admin')
      else if (role === 'agency') router.push('/agency/discover')
      else router.push('/dashboard')
    }

    // window.Capacitor 브릿지가 아직 안 붙어있는 순간에 체크하면 false로
    // 잘못 나올 수 있어(실측 확인됨) 비동기 재시도 버전으로 한 번만 판정
    isNativeAppAsync().then(isNative => {
      const isStandaloneApp = isNative
        || window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as unknown as { standalone?: boolean }).standalone === true
        || document.referrer.startsWith('android-app://')
      resolveSession(isStandaloneApp, 2)
    })
  }, [])

  if (showWelcome) return <WelcomeCarousel />
  if (!ready) return <div style={{ minHeight: '100vh', background: '#FFF8E7' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', color: '#241C15', fontFamily: 'inherit', overflowX: 'hidden' }}>

      {/* Atmospheric bg */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 700, background: 'radial-gradient(ellipse at center top, rgba(255,111,60,0.14) 0%, rgba(216,74,30,0.05) 40%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,111,60,0.06) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(216,74,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(216,74,30,0.02) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,248,231,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(36,28,21,0.08)', padding: '0 24px', paddingTop: 'var(--safe-top-0)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(145deg, #FFEDE0, #FFD9BC)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="23" height="23" viewBox="0 0 100 100">
                <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
                <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#FF6F3C" />
                <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(216,74,30,0.8)" />
              </svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#241C15' }}>Krookie</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLangOpen(o => !o)}
                style={{ background: 'rgba(36,28,21,0.05)', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 8, color: '#241C15', fontSize: 13, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 88, WebkitAppearance: 'none', appearance: 'none' }}>
                <span style={{ width: 14, flexShrink: 0 }} />
                <span>{LANG_LABELS[lang]}</span>
                <span style={{ width: 14, flexShrink: 0, fontSize: 10, opacity: 0.5, textAlign: 'right' }}>▼</span>
              </button>
              {langOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 140, boxShadow: '0 8px 24px rgba(36,28,21,0.15)' }}>
                  {LANGS.map(l => (
                    <button key={l} onClick={() => { changeLang(l); setLangOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, textAlign: 'center', cursor: 'pointer', background: l === lang ? 'rgba(255,111,60,0.12)' : 'none', color: l === lang ? '#D84A1E' : '#5B5346', border: 'none', fontWeight: l === lang ? 700 : 400 }}>
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link href="/login" style={{ fontSize: 14, color: '#8A7F6E', fontWeight: 600, textDecoration: 'none' }}>{tx.login}</Link>
          </div>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,111,60,0.1)', border: '1px solid rgba(255,111,60,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D84A1E', boxShadow: '0 0 8px rgba(216,74,30,0.6)' }} />
            <span style={{ fontSize: 13, color: '#D84A1E', fontWeight: 600 }}>{tx.tagline}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, marginBottom: 24, whiteSpace: 'pre-line', background: 'linear-gradient(135deg, #241C15 0%, rgba(36,28,21,0.75) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {tx.hero}
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: '#8A7F6E', lineHeight: 1.7, marginBottom: 48, whiteSpace: 'pre-line', wordBreak: 'keep-all', maxWidth: 560, margin: '0 auto 48px' }}>
            {tx.heroSub}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700, fontSize: 16, padding: '16px 32px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 20px rgba(216,74,30,0.35)' }}>
              {tx.ctaStart}
            </Link>
          </div>

          {/* 첫 오디션까지 남은 날. 오픈 전에 가입을 받아두려고 히어로 바로 아래에 둔다.
              오픈일이 지나면 컴포넌트가 스스로 사라진다. */}
          <div style={{ maxWidth: 360, margin: '32px auto 0' }}>
            <AuditionCountdown variant="signup" />
          </div>

          {/* 소셜 프루프 티커 */}
          <div style={{ marginTop: 48, overflow: 'hidden', borderTop: '1px solid rgba(219,39,119,0.25)', borderBottom: '1px solid rgba(219,39,119,0.25)', background: 'rgba(219,39,119,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: 44 }}>
              <div style={{ flexShrink: 0, padding: '0 16px', borderRight: '1px solid rgba(219,39,119,0.25)', height: '100%', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#DB2777', letterSpacing: '0.05em' }}>LIVE</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <LiveTicker items={[
                  { dot: true, text: ticker.result },
                  { dot: false, text: ticker.agencies },
                ]} />
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
            {(['talent', 'agency'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: tab === t ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : 'rgba(36,28,21,0.05)', color: tab === t ? 'white' : '#6B6355' }}>
                {t === 'talent' ? tx.forTalent : tx.forAgency}
              </button>
            ))}
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.08)', borderRadius: 24, padding: '48px 40px' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#241C15', marginBottom: 32, textAlign: 'center', wordBreak: 'keep-all' }}>
              {tab === 'talent' ? tx.talentTitle : tx.agencyTitle}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {(tab === 'talent' ? tx.talentPoints : tx.agencyPoints).map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px', background: 'rgba(255,111,60,0.06)', borderRadius: 14, border: '1px solid rgba(255,111,60,0.15)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 900, color: 'white' }}>{i + 1}</div>
                  <span style={{ fontSize: 15, color: '#5B5346', lineHeight: 1.5, fontWeight: 500, wordBreak: 'keep-all' }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#241C15', marginBottom: 56 }}>{tx.howTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {tx.steps.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.08)', borderRadius: 20, padding: '32px 24px', height: '100%' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 900, color: 'white', boxShadow: '0 4px 16px rgba(216,74,30,0.3)' }}>{i + 1}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#8A7F6E', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(216,74,30,0.14), rgba(255,111,60,0.08))', border: '1px solid rgba(255,111,60,0.25)', borderRadius: 28, padding: '64px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: '#241C15', marginBottom: 12, wordBreak: 'keep-all' }}>{tx.ctaTitle}</h2>
            <p style={{ fontSize: 16, color: '#D84A1E', marginBottom: 36, fontWeight: 600 }}>{tx.ctaSub}</p>
            <Link href="/signup" style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700, fontSize: 17, padding: '18px 48px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(216,74,30,0.35)', display: 'inline-block' }}>
              {tx.ctaStart}
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(36,28,21,0.08)', padding: '40px 24px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(145deg, #FFEDE0, #FFD9BC)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 100 100">
                  <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
                  <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#FF6F3C" />
                  <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(216,74,30,0.8)" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#241C15', fontSize: 15 }}>Krookie</div>
                <div style={{ fontSize: 12, color: '#8A7F6E' }}>{tx.footerDesc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Link href="/login" style={{ fontSize: 13, color: '#8A7F6E', textDecoration: 'none' }}>{tx.login}</Link>
              <Link href="/signup" style={{ fontSize: 13, color: '#8A7F6E', textDecoration: 'none' }}>{tx.ctaTalent}</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
