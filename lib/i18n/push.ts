import { LANGS, type Lang } from './translations'

// 푸시는 화면과 사정이 다르다. 화면 문구는 보는 사람의 브라우저에서 고르면
// 되지만, 푸시는 서버가 만들어 보낸다 — 그래서 수신자의 언어를 서버가 알아야
// 하고(profiles.lang), 문구도 서버에서 고를 수 있는 곳에 있어야 한다.
//
// 호출부는 완성된 문장 대신 키와 값만 넘긴다. 한 번의 발송이 열 개 언어로
// 갈라지는 일은 /api/push 안에서만 벌어진다.

type Msg = { title: string[]; body: string[] }

// 배열 순서는 translations.ts의 LANGS와 같다:
// ko, en, ja, zh, zh-TW, th, id, vi, tl, es
const M = {
  interest: {
    title: ['관심 표시', 'New interest', '関心が届きました', '有人关注你', '有人關注你', 'มีค่ายสนใจ', 'Ada yang tertarik', 'Có công ty quan tâm', 'May interesado', 'Nuevo interés'],
    body: ['{agency}이 내 영상을 관심 목록에 추가했어요', '{agency} added your video to their list', '{agency}があなたの動画を関心リストに追加しました', '{agency} 把你的视频加入了关注列表', '{agency} 把你的影片加入了關注列表', '{agency} เพิ่มวิดีโอของคุณในรายการที่สนใจ', '{agency} menambahkan videomu ke daftar minat', '{agency} đã thêm video của bạn vào danh sách quan tâm', 'Idinagdag ng {agency} ang video mo sa listahan nila', '{agency} añadió tu video a su lista'],
  },
  bookmarked: {
    title: ['관심 기획사 +1', 'An agency saved you', '事務所があなたを登録', '经纪公司关注了你', '經紀公司關注了你', 'ค่ายบันทึกคุณไว้', 'Agensi menyimpan profilmu', 'Một công ty đã lưu bạn', 'May ahensyang nag-save sa iyo', 'Una agencia te guardó'],
    body: ['{agency}이(가) 관심 지망생으로 등록했어요', '{agency} added you to their talent list', '{agency}が関心のある志望者として登録しました', '{agency} 把你加入了关注选手名单', '{agency} 把你加入了關注選手名單', '{agency} เพิ่มคุณเป็นผู้สมัครที่สนใจ', '{agency} menambahkanmu ke daftar talenta', '{agency} đã thêm bạn vào danh sách thí sinh quan tâm', 'Idinagdag ka ng {agency} sa talent list nila', '{agency} te añadió a su lista de talentos'],
  },
  chatRequest: {
    title: ['채팅 요청', 'New chat', 'チャットのお誘い', '有新对话', '有新對話', 'มีแชทใหม่', 'Chat baru', 'Tin nhắn mới', 'Bagong chat', 'Nuevo chat'],
    body: ['{agency}에서 채팅을 시작했어요', '{agency} started a chat with you', '{agency}がチャットを開始しました', '{agency} 和你开始了对话', '{agency} 和你開始了對話', '{agency} เริ่มแชทกับคุณ', '{agency} memulai chat denganmu', '{agency} đã bắt đầu trò chuyện với bạn', 'Nagsimula ng chat ang {agency}', '{agency} inició un chat contigo'],
  },
  offer: {
    title: ['오디션 제안이 왔어요 🎬', 'You got an audition offer 🎬', 'オーディションのお誘いです 🎬', '收到试镜邀请 🎬', '收到試鏡邀請 🎬', 'มีคำเชิญออดิชัน 🎬', 'Ada tawaran audisi 🎬', 'Bạn có lời mời thử vai 🎬', 'May audition offer ka 🎬', 'Tienes una invitación a audición 🎬'],
    body: ['{agency}에서 오디션 제안을 보냈어요.', '{agency} invited you to audition.', '{agency}からオーディションのお誘いが届きました。', '{agency} 向你发出了试镜邀请。', '{agency} 向你發出了試鏡邀請。', '{agency} เชิญคุณเข้าร่วมออดิชัน', '{agency} mengundangmu audisi.', '{agency} đã mời bạn thử vai.', 'Inimbitahan ka ng {agency} sa audition.', '{agency} te invitó a una audición.'],
  },
  passed: {
    title: ['1차 합격 🎉', 'You passed round 1 🎉', '一次選考通過 🎉', '通过初选 🎉', '通過初選 🎉', 'ผ่านรอบแรก 🎉', 'Lolos babak 1 🎉', 'Bạn đã qua vòng 1 🎉', 'Pasado sa round 1 🎉', 'Pasaste la ronda 1 🎉'],
    body: ['{agency}에서 메시지가 왔어요. 확인해보세요.', '{agency} sent you a message. Take a look.', '{agency}からメッセージが届きました。ご確認ください。', '{agency} 给你发来了消息,快去看看。', '{agency} 給你傳來了訊息,快去看看。', '{agency} ส่งข้อความถึงคุณ ลองเปิดดู', '{agency} mengirimimu pesan. Cek sekarang.', '{agency} đã nhắn tin cho bạn. Hãy xem thử.', 'Nagpadala ng mensahe ang {agency}. Tingnan mo.', '{agency} te envió un mensaje. Échale un vistazo.'],
  },
  reviewDone: {
    title: ['이번 회차 심사가 끝났어요', "This round's review is done", '今回の審査が終了しました', '本期评审已结束', '本期評審已結束', 'การพิจารณารอบนี้จบแล้ว', 'Penilaian putaran ini selesai', 'Vòng xét duyệt này đã kết thúc', 'Tapos na ang review ng round na ito', 'Terminó la revisión de esta ronda'],
    body: ['다음 오디션이 곧 열려요. 준비해두신 영상으로 바로 지원할 수 있어요.', 'The next audition opens soon. You can apply with the video you already have.', '次のオーディションがまもなく始まります。手持ちの動画ですぐ応募できます。', '下一场试镜很快开始,用你现有的视频就能报名。', '下一場試鏡很快開始,用你現有的影片就能報名。', 'ออดิชันครั้งถัดไปจะเปิดเร็วๆ นี้ สมัครด้วยคลิปที่มีอยู่ได้เลย', 'Audisi berikutnya segera dibuka. Daftar saja dengan video yang sudah ada.', 'Buổi thử vai tiếp theo sắp mở. Bạn có thể ứng tuyển bằng video sẵn có.', 'Malapit nang magbukas ang susunod na audisyon. Pwede kang mag-apply gamit ang video mo.', 'La próxima audición abre pronto. Puedes postularte con el video que ya tienes.'],
  },
  newAudition: {
    title: ['새 오디션이 열렸어요', 'A new audition just opened', '新しいオーディションが始まりました', '新试镜开放了', '新試鏡開放了', 'ออดิชันใหม่เปิดแล้ว', 'Audisi baru telah dibuka', 'Đã mở buổi thử vai mới', 'May bagong audisyon na bukas', 'Se abrió una nueva audición'],
    // 공고 제목은 기획사가 쓴 그대로 보여준다
    body: ['{title}', '{title}', '{title}', '{title}', '{title}', '{title}', '{title}', '{title}', '{title}', '{title}'],
  },
  newAuditionPosted: {
    title: ['새 오디션 공고', 'New audition posted', '新しいオーディション情報', '新试镜公告', '新試鏡公告', 'ประกาศออดิชันใหม่', 'Pengumuman audisi baru', 'Thông báo thử vai mới', 'Bagong audition posting', 'Nueva convocatoria'],
    body: ['{title} 오디션이 올라왔어요!', 'The {title} audition is up!', '{title}のオーディションが公開されました!', '{title} 试镜已发布!', '{title} 試鏡已發布!', 'ประกาศออดิชัน {title} ขึ้นแล้ว!', 'Audisi {title} sudah tayang!', 'Buổi thử vai {title} đã lên!', 'Nakapost na ang {title} audition!', '¡Ya está la audición de {title}!'],
  },
  deadlineToday: {
    title: ['오늘 저녁 9시 마감', 'Closes today at 9pm', '本日21時に締切', '今天 21:00 截止', '今天 21:00 截止', 'ปิดรับวันนี้ 21:00 น.', 'Tutup hari ini pukul 21.00', 'Đóng hôm nay lúc 21h', 'Sasara ngayon nang 9pm', 'Cierra hoy a las 21:00'],
    body: ['{first}{more} 지원이 오늘 저녁 9시에 마감돼요.', 'Applications for {first}{more} close today at 9pm KST.', '{first}{more}の応募は本日21時（韓国時間）に締め切ります。', '{first}{more} 的报名将在今天 21:00（韩国时间）截止。', '{first}{more} 的報名將在今天 21:00（韓國時間）截止。', 'การสมัคร {first}{more} จะปิดวันนี้เวลา 21:00 น. (เวลาเกาหลี)', 'Pendaftaran {first}{more} ditutup hari ini pukul 21.00 WK.', 'Đơn ứng tuyển {first}{more} đóng lúc 21:00 hôm nay (giờ Hàn Quốc).', 'Sasara ang application para sa {first}{more} ngayong 9pm KST.', 'Las postulaciones a {first}{more} cierran hoy a las 21:00 (hora de Corea).'],
  },
  deadlineTomorrow: {
    title: ['내일 마감이에요', 'Closes tomorrow', '明日が締切です', '明天截止', '明天截止', 'ปิดรับพรุ่งนี้', 'Tutup besok', 'Đóng vào ngày mai', 'Sasara bukas', 'Cierra mañana'],
    body: ['{first}{more} 지원, 내일 저녁 9시까지예요. 영상 하나면 지원할 수 있어요.', 'Applications for {first}{more} close tomorrow at 9pm KST. One video is all you need.', '{first}{more}の応募は明日21時（韓国時間）まで。動画1本で応募できます。', '{first}{more} 的报名到明天 21:00（韩国时间）为止，一个视频就能报名。', '{first}{more} 的報名到明天 21:00（韓國時間）為止，一支影片就能報名。', 'สมัคร {first}{more} ได้ถึงพรุ่งนี้ 21:00 น. (เวลาเกาหลี) ใช้วิดีโอเดียวก็สมัครได้', 'Pendaftaran {first}{more} sampai besok pukul 21.00 WK. Cukup satu video.', 'Ứng tuyển {first}{more} đến 21h ngày mai (giờ Hàn Quốc). Chỉ cần một video.', 'Hanggang bukas ng 9pm KST ang application para sa {first}{more}. Isang video lang ang kailangan.', 'Las postulaciones a {first}{more} cierran mañana a las 21:00 (hora de Corea). Solo necesitas un video.'],
  },
  bugReplied: {
    title: ['신고에 답장이 왔어요', 'We replied to your report', 'ご報告に返信しました', '你的反馈有回复了', '你的回報有回覆了', 'มีคำตอบสำหรับรายงานของคุณ', 'Laporanmu sudah dibalas', 'Đã có phản hồi cho báo cáo của bạn', 'May sagot na sa report mo', 'Respondimos a tu reporte'],
    body: ['보내주신 버그 신고를 확인했어요. 눌러서 답장을 읽어보세요.', 'We looked into the bug you reported. Tap to read our reply.', 'お送りいただいた不具合を確認しました。タップして返信をご覧ください。', '我们已经查看了你反馈的问题,点击查看回复。', '我們已經查看了你回報的問題,點擊查看回覆。', 'เราตรวจสอบปัญหาที่คุณแจ้งแล้ว แตะเพื่ออ่านคำตอบ', 'Kami sudah memeriksa bug yang kamu laporkan. Ketuk untuk membaca balasannya.', 'Chúng tôi đã xem lỗi bạn báo. Nhấn để đọc phản hồi.', 'Tiningnan namin ang bug na na-report mo. I-tap para basahin ang sagot.', 'Revisamos el error que reportaste. Toca para leer la respuesta.'],
  },
} satisfies Record<string, Msg>

export type PushKey = keyof typeof M

// "외 2개"처럼 뒤에 붙는 조각. 개수가 0이면 통째로 사라져야 해서 본문 배열이
// 아니라 여기서 따로 만든다.
const AND_MORE = [' 외 {n}개', ' and {n} more', ' 他{n}件', ' 等 {n} 个', ' 等 {n} 個', ' และอีก {n} รายการ', ' dan {n} lainnya', ' và {n} mục khác', ' at {n} pa', ' y {n} más']

export const DEFAULT_PUSH_LANG: Lang = 'ko'

function pick(arr: string[], lang: Lang): string {
  const i = LANGS.indexOf(lang)
  return (i >= 0 ? arr[i] : undefined) ?? arr[0]
}

export function isPushKey(v: unknown): v is PushKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(M, v)
}

export function normalizeLang(v: unknown): Lang {
  return LANGS.includes(v as Lang) ? (v as Lang) : DEFAULT_PUSH_LANG
}

/**
 * moreCount를 넘기면 {more} 자리가 해당 언어의 "외 n개"로 채워진다(0이면 빈 문자열).
 * 남은 {자리}는 params에서 그대로 치환한다.
 */
export function renderPush(
  key: PushKey,
  lang: Lang,
  params: Record<string, string | number> = {},
): { title: string; body: string } {
  const filled: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) filled[k] = String(v)

  const n = Number(params.moreCount ?? 0)
  filled.more = n > 0 ? pick(AND_MORE, lang).replace('{n}', String(n)) : ''

  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => (k in filled ? filled[k] : m))
  return { title: fill(pick(M[key].title, lang)), body: fill(pick(M[key].body, lang)) }
}
