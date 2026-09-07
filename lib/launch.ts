// 첫 오디션 오픈일. 홈·오디션 목록·랜딩의 카운트다운이 전부 이 값 하나를 본다.
// 날짜가 바뀌면 여기만 고치면 된다.
export const AUDITION_LAUNCH = '2026-10-01'

// 첫 회차만 길다 — 10/1 목요일에 열어 10/11 일요일 밤에 닫는다.
// 그 뒤로는 매주 월요일 저녁 6시에 열려 그 주 일요일 밤 11시 59분에 닫는다.
// 회차를 가리키는 값은 마감일 하나뿐이라, 오픈 시각은 마감일에서 되짚어 구한다.
export const FIRST_DEADLINE = '2026-10-11'
export const OPEN_HOUR_KST = 18

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
