// 첫 오디션 오픈일. 홈·오디션 목록·랜딩의 카운트다운이 전부 이 값 하나를 본다.
// 날짜가 바뀌면 여기만 고치면 된다.
export const AUDITION_LAUNCH = '2026-10-01'

// 첫 회차만 길다 — 10/1 목요일에 열어 10/11 일요일 저녁에 닫는다.
// 그 뒤로는 매주 월요일 저녁 6시에 열려 그 주 일요일 저녁 9시에 닫는다.
// 회차를 가리키는 값은 마감일 하나뿐이라, 오픈 시각은 마감일에서 되짚어 구한다.
export const FIRST_DEADLINE = '2026-10-11'
export const OPEN_HOUR_KST = 18
// 마감 시각. 공고에는 날짜만 저장하고 시각은 여기서 정한다 — 매주 같은
// 시각이라 행마다 담을 이유가 없다. 밤 12시가 아니라 저녁 9시인 건
// 마감 알림을 저녁에 보내고도 한두 시간 여유가 남아야 하기 때문이다.
export const CLOSE_HOUR_KST = 21

/** 그 회차가 열리는 시각. 첫 회차만 예외다. */
export function roundOpensAt(deadline: string): Date {
  if (deadline === FIRST_DEADLINE) return new Date(`${AUDITION_LAUNCH}T00:00:00+09:00`)
  const close = new Date(`${deadline}T00:00:00+09:00`)
  const monday = new Date(close.getTime() - 6 * 86400_000)
  return new Date(monday.getTime() + OPEN_HOUR_KST * 3600_000)
}

// D-day는 시분초가 아니라 "날짜 차이"로 세야 한다. 한국 기준 자정을 기준선으로
// 삼는다 — 해외 사용자가 봐도 공고가 열리는 시점은 한국 시간이라 그게 맞다.
function kstDayStart(ms: number): number {
  const shifted = new Date(ms + 9 * 3600_000)
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 9 * 3600_000
}

export function launchDate(): Date {
  return new Date(`${AUDITION_LAUNCH}T00:00:00+09:00`)
}

/** 남은 일수. 0이면 오픈 당일, 음수면 이미 시작했다는 뜻. */
export function daysUntilLaunch(now: Date = new Date()): number {
  return Math.round((kstDayStart(launchDate().getTime()) - kstDayStart(now.getTime())) / 86400000)
}

/** "10월 1일"처럼 사용자 언어에 맞춘 날짜 표기 */
export function launchDateLabel(lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : lang, {
      month: 'long', day: 'numeric', timeZone: 'Asia/Seoul',
    }).format(launchDate())
  } catch {
    return AUDITION_LAUNCH
  }
}

const DAY = 86400_000

/** n회차의 마감일(YYYY-MM-DD). 1회차가 FIRST_DEADLINE이고 이후 매주. */
export function roundDeadline(n: number): string {
  const first = new Date(`${FIRST_DEADLINE}T00:00:00+09:00`).getTime()
  return new Date(first + (n - 1) * 7 * DAY + 9 * 3600_000).toISOString().slice(0, 10)
}

/** 지금 진행 중이거나 다음에 열릴 회차 번호 */
export function currentRoundNo(now: number = Date.now()): number {
  const first = roundClosesAt(FIRST_DEADLINE).getTime()
  if (now <= first) return 1
  return Math.floor((now - first) / (7 * DAY)) + 2
}

/** 마감일이 몇 회차인지. 규칙에 안 맞는 날짜면 null(특별 공고). */
export function roundNoOf(deadline: string): number | null {
  if (!deadline) return null
  const first = new Date(`${FIRST_DEADLINE}T00:00:00+09:00`).getTime()
  const t = new Date(`${deadline}T00:00:00+09:00`).getTime()
  const diff = t - first
  if (diff < 0 || diff % (7 * DAY) !== 0) return null
  return diff / (7 * DAY) + 1
}

/** 그 회차가 닫히는 시각(한국 저녁 9시). */
export function roundClosesAt(deadline: string): Date {
  return new Date(`${deadline}T${String(CLOSE_HOUR_KST).padStart(2, '0')}:00:00+09:00`)
}

/**
 * 마감이 지났는가. 날짜 문자열끼리 견주면 그날 자정까지 열려 있게 되어
 * 실제로 "밤 12시 마감"이 됐다. 시각까지 본다.
 */
export function isRoundClosed(deadline: string | null | undefined, now: Date = new Date()): boolean {
  if (!deadline) return false
  return now.getTime() >= roundClosesAt(deadline).getTime()
}

/**
 * 아직 열릴 시각이 안 됐는가. 어드민이 미리 게시해 두어도 정해진 월요일
 * 저녁 6시가 되기 전에는 지망생에게 보이지 않는다 — 크론에 기대면 한 시간까지
 * 늦게 열릴 수 있어서, 화면 쪽에서 시각을 직접 본다.
 *
 * 회차 규칙에 안 맞는 날짜(특별 공고)는 게시하는 순간 공개한다.
 */
export function isRoundNotOpenYet(deadline: string | null | undefined, now: Date = new Date()): boolean {
  if (!deadline) return false
  if (roundNoOf(deadline) === null) return false
  return now.getTime() < roundOpensAt(deadline).getTime()
}
