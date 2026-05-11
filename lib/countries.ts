export type Country = { code: string; flag: string; name: string; nameKo: string }

export const COUNTRIES: Country[] = [
  { code: 'KR', flag: '🇰🇷', name: 'South Korea', nameKo: '대한민국' },
  { code: 'US', flag: '🇺🇸', name: 'United States', nameKo: '미국' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', nameKo: '일본' },
  { code: 'CN', flag: '🇨🇳', name: 'China', nameKo: '중국' },
  { code: 'TW', flag: '🇹🇼', name: 'Taiwan', nameKo: '대만' },
  { code: 'HK', flag: '🇭🇰', name: 'Hong Kong', nameKo: '홍콩' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', nameKo: '태국' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', nameKo: '필리핀' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', nameKo: '인도네시아' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', nameKo: '말레이시아' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', nameKo: '싱가포르' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', nameKo: '베트남' },
  { code: 'IN', flag: '🇮🇳', name: 'India', nameKo: '인도' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', nameKo: '멕시코' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', nameKo: '브라질' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', nameKo: '아르헨티나' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile', nameKo: '칠레' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia', nameKo: '콜롬비아' },
  { code: 'PE', flag: '🇵🇪', name: 'Peru', nameKo: '페루' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', nameKo: '영국' },
  { code: 'FR', flag: '🇫🇷', name: 'France', nameKo: '프랑스' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', nameKo: '독일' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', nameKo: '스페인' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', nameKo: '이탈리아' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', nameKo: '포르투갈' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', nameKo: '네덜란드' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', nameKo: '폴란드' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', nameKo: '러시아' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', nameKo: '터키' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', nameKo: '사우디아라비아' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE', nameKo: '아랍에미리트' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt', nameKo: '이집트' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', nameKo: '남아프리카' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', nameKo: '나이지리아' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', nameKo: '호주' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', nameKo: '뉴질랜드' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', nameKo: '캐나다' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', nameKo: '스웨덴' },
  { code: 'NO', flag: '🇳🇴', name: 'Norway', nameKo: '노르웨이' },
  { code: 'DK', flag: '🇩🇰', name: 'Denmark', nameKo: '덴마크' },
  { code: 'FI', flag: '🇫🇮', name: 'Finland', nameKo: '핀란드' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium', nameKo: '벨기에' },
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland', nameKo: '스위스' },
  { code: 'AT', flag: '🇦🇹', name: 'Austria', nameKo: '오스트리아' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece', nameKo: '그리스' },
  { code: 'RO', flag: '🇷🇴', name: 'Romania', nameKo: '루마니아' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', nameKo: '파키스탄' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', nameKo: '방글라데시' },
  { code: 'MM', flag: '🇲🇲', name: 'Myanmar', nameKo: '미얀마' },
  { code: 'KH', flag: '🇰🇭', name: 'Cambodia', nameKo: '캄보디아' },
  { code: 'MN', flag: '🇲🇳', name: 'Mongolia', nameKo: '몽골' },
]

export function getFlagByCode(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag ?? ''
}

export function getFlagImageUrl(code: string, size: number = 20): string {
  return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`
}

export function getCountryName(code: string, locale: string): string {
  const c = COUNTRIES.find(c => c.code === code)
  if (!c) return ''
  return locale === 'ko' ? c.nameKo : c.name
}
