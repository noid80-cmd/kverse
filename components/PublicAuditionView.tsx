'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/context'
import { LANGS } from '@/lib/i18n/translations'
import { roundClosesAt, roundOpensAt, isRoundNotOpenYet } from '@/lib/launch'
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

// 공개 페이지에서만 쓰는 문구라 기존 사전을 늘리지 않고 여기서 관리한다.
// 순서는 lib/i18n/translations.ts 의 LANGS 와 같다.
//
// 예전엔 ko/en 둘뿐이라 한국어가 아니면 전부 영어로 떨어졌다. 이 페이지가
// 홍보 링크의 착륙지점이라 그 자리에서 언어가 맞아야 한다.
const COPY_T = {
  open:        ['모집 중', 'Now accepting', '募集中', '招募中', '招募中', 'เปิดรับสมัคร', 'Sedang dibuka', 'Đang nhận hồ sơ', 'Bukás na', 'Convocatoria abierta'],
  soon:        ['곧 열려요', 'Opening soon', 'まもなく公開', '即将开放', '即將開放', 'เปิดเร็ว ๆ นี้', 'Segera dibuka', 'Sắp mở', 'Malapit nang buksan', 'Abre pronto'],
  opensAt:     ['{d}에 열려요', 'Opens {d} (KST)', '{d}に公開（韓国時間）', '{d} 开放（韩国时间）', '{d} 開放（韓國時間）', 'เปิด {d} (เวลาเกาหลี)', 'Dibuka {d} (WK)', 'Mở {d} (giờ Hàn Quốc)', 'Bubukas {d} (KST)', 'Abre el {d} (hora de Corea)'],
  closed:      ['마감', 'Closed', '締切', '已截止', '已截止', 'ปิดรับแล้ว', 'Ditutup', 'Đã đóng', 'Sarado', 'Cerrada'],
  ddayToday:   ['오늘 마감', 'Closes today', '本日締切', '今天截止', '今天截止', 'ปิดรับวันนี้', 'Ditutup hari ini', 'Đóng hôm nay', 'Sarado ngayon', 'Cierra hoy'],
  ddayLeft:    ['마감 D-{n}', '{n} days left', '締切まで{n}日', '还剩 {n} 天', '還剩 {n} 天', 'เหลืออีก {n} วัน', 'Sisa {n} hari', 'Còn {n} ngày', '{n} araw na lang', 'Quedan {n} días'],
  deadline:    ['마감', 'Deadline', '締切', '截止时间', '截止時間', 'ปิดรับ', 'Batas waktu', 'Hạn chót', 'Deadline', 'Cierre'],
  category:    ['분야', 'Category', '分野', '类别', '類別', 'ประเภท', 'Kategori', 'Hạng mục', 'Kategorya', 'Categoría'],
  mode:        ['진행 방식', 'Format', '実施方法', '形式', '形式', 'รูปแบบ', 'Format', 'Hình thức', 'Format', 'Formato'],
  online:      ['온라인', 'Online', 'オンライン', '线上', '線上', 'ออนไลน์', 'Online', 'Trực tuyến', 'Online', 'En línea'],
  offline:     ['오프라인', 'In person', '対面', '线下', '線下', 'พบตัวจริง', 'Tatap muka', 'Trực tiếp', 'Harapan', 'Presencial'],
  both:        ['온라인 + 오프라인', 'Online + In person', 'オンライン+対面', '线上+线下', '線上+線下', 'ออนไลน์ + พบตัวจริง', 'Online + tatap muka', 'Trực tuyến + trực tiếp', 'Online + harapan', 'En línea + presencial'],
  apply:       ['지원하기', 'Apply now', '応募する', '立即报名', '立即報名', 'สมัครเลย', 'Daftar sekarang', 'Ứng tuyển ngay', 'Mag-apply na', 'Postular ahora'],
  applyClosed: ['마감된 오디션입니다', 'This audition has closed', 'このオーディションは締め切りました', '该试镜已截止', '該試鏡已截止', 'ออดิชันนี้ปิดรับแล้ว', 'Audisi ini sudah ditutup', 'Buổi thử vai này đã đóng', 'Sarado na ang audisyong ito', 'Esta audición ya cerró'],
  applyOffline:['현장에서 진행되는 오디션입니다', 'Held in person', '対面で行われるオーディションです', '该试镜为线下进行', '該試鏡為線下進行', 'ออดิชันนี้จัดแบบพบตัวจริง', 'Audisi ini digelar tatap muka', 'Buổi thử vai này diễn ra trực tiếp', 'Ginaganap ito nang harapan', 'Esta audición es presencial'],
  offlineNote: ['이 공고는 온라인 지원을 받지 않습니다. 지원 방법은 공고 내용을 확인해주세요.', 'This audition does not accept online applications. See the posting for how to apply.', 'この募集はオンライン応募を受け付けていません。応募方法は募集内容をご確認ください。', '该招募不接受线上报名，报名方式请查看公告内容。', '該招募不接受線上報名，報名方式請查看公告內容。', 'ประกาศนี้ไม่รับสมัครออนไลน์ กรุณาดูวิธีสมัครในรายละเอียดประกาศ', 'Lowongan ini tidak menerima pendaftaran online. Lihat isi pengumuman untuk cara mendaftar.', 'Thông báo này không nhận hồ sơ trực tuyến. Vui lòng xem nội dung thông báo để biết cách ứng tuyển.', 'Hindi tumatanggap ng online application ang audisyong ito. Tingnan ang paskil para sa paraan ng pag-apply.', 'Esta convocatoria no acepta postulaciones en línea. Consulta el anuncio para saber cómo postular.'],
  how:         ['지원 방법', 'How to apply', '応募方法', '报名方式', '報名方式', 'วิธีสมัคร', 'Cara mendaftar', 'Cách ứng tuyển', 'Paano mag-apply', 'Cómo postular'],
  step1:       ['Krookie 가입 (30초)', 'Sign up for Krookie (30 seconds)', 'Krookie に登録（30秒）', '注册 Krookie（30秒）', '註冊 Krookie（30秒）', 'สมัคร Krookie (30 วินาที)', 'Daftar Krookie (30 detik)', 'Đăng ký Krookie (30 giây)', 'Mag-sign up sa Krookie (30 segundo)', 'Regístrate en Krookie (30 segundos)'],
  step2:       ['갖고 있는 영상 선택 또는 새로 업로드', 'Pick a video you already have, or upload a new one', '手持ちの動画を選ぶか、新しくアップロード', '选择已有视频或上传新视频', '選擇已有影片或上傳新影片', 'เลือกวิดีโอที่มีอยู่ หรืออัปโหลดใหม่', 'Pilih video yang sudah ada, atau unggah baru', 'Chọn video có sẵn hoặc tải lên video mới', 'Pumili ng video na mayroon ka na, o mag-upload ng bago', 'Elige un video que ya tengas o sube uno nuevo'],
  step3:       ['지원 완료 — 결과는 앱으로 알려드립니다', 'Done — you will hear back in the app', '応募完了 — 結果はアプリでお知らせします', '报名完成 — 结果将在应用内通知', '報名完成 — 結果將在應用內通知', 'สมัครเสร็จ — แจ้งผลทางแอป', 'Selesai — hasilnya kami beri tahu lewat aplikasi', 'Hoàn tất — kết quả sẽ được báo qua ứng dụng', 'Tapos na — sa app namin sasabihin ang resulta', 'Listo: te avisaremos en la app'],
  note:        ['이미 갖고 있는 커버 영상으로 지원할 수 있습니다. 새로 촬영하지 않아도 됩니다.', 'You can apply with a cover video you already have. No new filming required.', 'すでにあるカバー動画で応募できます。撮り直す必要はありません。', '可以用已有的翻唱视频报名，无需重新拍摄。', '可以用已有的翻唱影片報名，無需重新拍攝。', 'สมัครด้วยวิดีโอคัฟเวอร์ที่มีอยู่ได้เลย ไม่ต้องถ่ายใหม่', 'Bisa mendaftar dengan video cover yang sudah ada. Tidak perlu syuting ulang.', 'Bạn có thể ứng tuyển bằng video cover có sẵn. Không cần quay lại.', 'Puwede kang mag-apply gamit ang cover video na mayroon ka na. Hindi na kailangang mag-shoot ulit.', 'Puedes postular con un video cover que ya tengas. No hace falta grabar de nuevo.'],
  otherLink:   ['다른 오디션 보기', 'Browse other auditions', 'ほかのオーディションを見る', '查看其他试镜', '查看其他試鏡', 'ดูออดิชันอื่น', 'Lihat audisi lain', 'Xem các buổi thử vai khác', 'Tingnan ang ibang audisyon', 'Ver otras audiciones'],
  vocal:       ['보컬', 'Vocal', 'ボーカル', '声乐', '聲樂', 'ร้องเพลง', 'Vokal', 'Thanh nhạc', 'Vocal', 'Vocal'],
  dance:       ['댄스', 'Dance', 'ダンス', '舞蹈', '舞蹈', 'เต้น', 'Dance', 'Nhảy', 'Sayaw', 'Baile'],
  acting:      ['연기', 'Acting', '演技', '表演', '表演', 'การแสดง', 'Akting', 'Diễn xuất', 'Pag-arte', 'Actuación'],
  rap:         ['랩', 'Rap', 'ラップ', '说唱', '饒舌', 'แร็ป', 'Rap', 'Rap', 'Rap', 'Rap'],
  other:       ['기타', 'Other', 'その他', '其他', '其他', 'อื่น ๆ', 'Lainnya', 'Khác', 'Iba pa', 'Otro'],
} as const

function copyFor(lang: string) {
  const i = Math.max(0, (LANGS as readonly string[]).indexOf(lang))
  // 사전에 없는 언어는 영어로 떨어진다(색인 1).
  const pick = (a: readonly string[]) => a[i] ?? a[1]
  return {
    open: pick(COPY_T.open), closed: pick(COPY_T.closed), soon: pick(COPY_T.soon),
    opensAt: (d: string) => pick(COPY_T.opensAt).replace('{d}', d),
    dday: (n: number) => (n === 0 ? pick(COPY_T.ddayToday) : pick(COPY_T.ddayLeft).replace('{n}', String(n))),
    deadline: pick(COPY_T.deadline), category: pick(COPY_T.category), mode: pick(COPY_T.mode),
    online: pick(COPY_T.online), offline: pick(COPY_T.offline), both: pick(COPY_T.both),
    apply: pick(COPY_T.apply), applyClosed: pick(COPY_T.applyClosed), applyOffline: pick(COPY_T.applyOffline),
    offlineNote: pick(COPY_T.offlineNote), how: pick(COPY_T.how),
    steps: [pick(COPY_T.step1), pick(COPY_T.step2), pick(COPY_T.step3)],
    note: pick(COPY_T.note), otherLink: pick(COPY_T.otherLink),
    vocal: pick(COPY_T.vocal), dance: pick(COPY_T.dance), acting: pick(COPY_T.acting),
    rap: pick(COPY_T.rap), other: pick(COPY_T.other),
  }
}

// 남은 날을 한국 시각 기준으로 센다. 보는 사람이 어느 나라에 있든 마감은
// 한국 일요일 저녁 9시라서, 기기 시간대로 세면 하루씩 어긋난다.
function daysUntil(deadline: string) {
  const close = roundClosesAt(deadline).getTime()
  const now = Date.now()
  if (now >= close) return -1
  return Math.ceil((close - now) / 86400000) - 1
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
  // 열리는 시각은 status 가 아니라 시계로 본다. 크론이 열어주기를 기다리면
  // 한 시간까지 늦는다 — 링크를 미리 뿌려도 지원은 정각부터 된다.
  const notOpenYet = isRoundNotOpenYet(audition.deadline)
  const published = audition.status === 'active' || audition.status === 'scheduled'
  const isOpen = published && !notOpenYet && (left === null || left >= 0)
  // /dashboard/auditions 는 mode === 'offline' 공고의 지원을 막는다. 여기서도 막지 않으면
  // 지원하기를 눌러 이동한 뒤에야 지원이 안 된다는 걸 알게 된다.
  const isOffline = audition.mode === 'offline'
  const canApply = isOpen && !isOffline

  // "10월 6일 오후 6시"처럼 보는 사람 언어로 적는다.
  const openLabel = audition.deadline && notOpenYet
    ? new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : lang, {
        month: 'long', day: 'numeric', hour: 'numeric', timeZone: 'Asia/Seoul',
      }).format(roundOpensAt(audition.deadline))
    : ''

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
          {isOpen ? c.open : notOpenYet ? c.soon : c.closed}
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
            ) : notOpenYet ? (
              c.opensAt(openLabel)
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
