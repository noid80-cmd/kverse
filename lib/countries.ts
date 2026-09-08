// 국적은 DB에 한글 문자열("대한민국")로 저장돼 있고 기획사 화면도 그 값을 그대로
// 보여준다. 저장값은 건드리지 않고 화면에 뿌릴 때만 사용자 언어로 바꾼다.
// 나라 이름을 언어별로 다 적어두면 63개 × 10개 언어를 손으로 관리해야 하는데,
// Intl.DisplayNames가 이미 갖고 있는 데이터라 코드만 들고 있으면 된다.

export type Country = { ko: string; code: string }

// UN M49 지역 코드 — Intl.DisplayNames가 언어별 그룹 이름을 만들어준다.
export const COUNTRY_GROUPS: { region: string; items: Country[] }[] = [
  {
    region: '142', // Asia
    items: [
      { ko: '대한민국', code: 'KR' },
      { ko: '조선민주주의인민공화국', code: 'KP' },
      { ko: '중국', code: 'CN' },
      { ko: '일본', code: 'JP' },
      { ko: '대만', code: 'TW' },
      { ko: '홍콩', code: 'HK' },
      { ko: '태국', code: 'TH' },
      { ko: '베트남', code: 'VN' },
      { ko: '필리핀', code: 'PH' },
      { ko: '인도네시아', code: 'ID' },
      { ko: '말레이시아', code: 'MY' },
      { ko: '싱가포르', code: 'SG' },
      { ko: '미얀마', code: 'MM' },
      { ko: '캄보디아', code: 'KH' },
      { ko: '몽골', code: 'MN' },
      { ko: '인도', code: 'IN' },
      { ko: '파키스탄', code: 'PK' },
      { ko: '방글라데시', code: 'BD' },
      { ko: '카자흐스탄', code: 'KZ' },
      { ko: '우즈베키스탄', code: 'UZ' },
      { ko: '사우디아라비아', code: 'SA' },
      { ko: '아랍에미리트', code: 'AE' },
      { ko: '이스라엘', code: 'IL' },
      { ko: '터키', code: 'TR' },
      { ko: '이란', code: 'IR' },
    ],
  },
  {
    region: '019', // Americas
    items: [
      { ko: '미국', code: 'US' },
      { ko: '캐나다', code: 'CA' },
      { ko: '멕시코', code: 'MX' },
      { ko: '브라질', code: 'BR' },
      { ko: '아르헨티나', code: 'AR' },
      { ko: '콜롬비아', code: 'CO' },
      { ko: '칠레', code: 'CL' },
      { ko: '페루', code: 'PE' },
    ],
  },
  {
    region: '150', // Europe
    items: [
      { ko: '영국', code: 'GB' },
      { ko: '프랑스', code: 'FR' },
      { ko: '독일', code: 'DE' },
      { ko: '스페인', code: 'ES' },
      { ko: '이탈리아', code: 'IT' },
      { ko: '포르투갈', code: 'PT' },
      { ko: '네덜란드', code: 'NL' },
      { ko: '벨기에', code: 'BE' },
      { ko: '스웨덴', code: 'SE' },
      { ko: '노르웨이', code: 'NO' },
      { ko: '덴마크', code: 'DK' },
      { ko: '핀란드', code: 'FI' },
      { ko: '폴란드', code: 'PL' },
      { ko: '러시아', code: 'RU' },
      { ko: '우크라이나', code: 'UA' },
    ],
  },
  {
    region: '009', // Oceania
    items: [
      { ko: '호주', code: 'AU' },
      { ko: '뉴질랜드', code: 'NZ' },
    ],
  },
  {
    region: '002', // Africa
    items: [
      { ko: '이집트', code: 'EG' },
      { ko: '남아프리카공화국', code: 'ZA' },
      { ko: '나이지리아', code: 'NG' },
    ],
  },
]

// 한국어면 저장값을 그대로 쓴다 — 이미 한글이고, 기획사가 보는 표기와 같아야 한다.
// 그 외 언어는 Intl에 맡기고, 지원하지 않는 언어(tl 등)는 영어로 떨어뜨린다.
function display(code: string, lang: string): string | null {
  try {
    return new Intl.DisplayNames([lang, 'en'], { type: 'region' }).of(code) ?? null
  } catch {
    return null
  }
}

export function countryLabel(c: Country, lang: string): string {
  if (lang === 'ko') return c.ko
  return display(c.code, lang) ?? c.ko
}

export function regionLabel(region: string, lang: string): string {
  return display(region, lang) ?? region
}
