// 기획사 이름은 보는 사람의 언어에 맞춰 고른다.
//
// 영어로 앱을 열었는데 "미스틱스토리엔터테인먼트"만 한글로 남아 있었다.
// 한 화면에 한 줄이 섞여도 그 화면 전체가 미완성으로 읽힌다 — 해외 지망생이
// 실제 사용자인 앱에서는 특히 그렇다.
//
// 언어별로 칸을 만들지 않고 영문 하나만 둔 건, 기획사 이름이 번역이 아니라
// 표기이기 때문이다. CUBE Entertainment는 일본어 화면에서도 CUBE
// Entertainment다. 열 칸을 만들어 봐야 같은 값이 열 번 들어간다.

export type NamedAgency = { name?: string | null; name_en?: string | null }

/** 화면에 쓸 기획사 이름. 한국어면 한글, 아니면 영문 표기(없으면 한글). */
export function agencyName(agency: NamedAgency | null | undefined, lang: string): string {
  if (!agency) return ''
  const ko = agency.name ?? ''
  if (lang === 'ko') return ko
  return agency.name_en || ko
}

/**
 * 로고가 없을 때 대신 놓는 글자.
 *
 * 한글은 한 글자에 담기는 뜻이 커서 두세 자면 알아보지만, 라틴 문자는
 * 두 자로는 뭘 말하는지 알 수 없다("CUBE Entertainment" → "CU"). 글자
 * 종류에 따라 자르는 길이를 달리한다.
 */
export function agencyInitials(agency: NamedAgency | null | undefined, lang: string, korean = 3): string {
  const name = agencyName(agency, lang)
  if (!name) return ''
  const isHangul = /[가-힣]/.test(name[0])
  if (isHangul) return name.slice(0, korean)
  // 영문은 첫 낱말이 곧 이름인 경우가 많다(P NATION, ANTENNA, MYSTIC STORY).
  const first = name.split(/\s+/)[0]
  return first.length <= 5 ? first : first.slice(0, 4)
}
