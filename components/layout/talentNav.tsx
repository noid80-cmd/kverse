'use client'

import { Home, Video, Megaphone, Compass, Bell } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'
import { useNavBadges } from '@/lib/useNavBadges'

// 지망생 하단 탭. 예전엔 이 배열이 화면 8곳에 그대로 복붙돼 있어서 순서 하나
// 바꾸려면 8군데를 고쳐야 했고, 실제로 파일마다 라벨이 조금씩 어긋나 있었다.
//
// 배치 의도: 한가운데 원형 버튼이 오디션이다. 예전엔 여기가 영상 업로드였는데,
// "올리기"라는 동사가 "오디션 지원하기"와 헷갈렸다 — 올린 영상은 탐색에도
// 공개되고 지원서 첨부로도 쓰여서 한 단어가 두 뜻을 가졌다. 그래서 탭에서
// 동사를 빼고 "내 영상"(보관함)으로 바꿨다. 지원이라는 행동은 오디션 안에서만
// 일어난다.
export function useTalentNav() {
  const { lang } = useLang()
  const tx = useT(lang)
  // 알림은 한 번 지나가면 끝이라, 앱을 열었을 때 뭐가 새로 생겼는지 알 방법이
  // 없었다. 채팅과 제안은 둘 다 반응 탭 안에 있어서 한 숫자로 합친다.
  const badges = useNavBadges('talent')

  return [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/videos', label: tx.nav.myVideos, icon: <Video size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={24} strokeWidth={2.2} color="white" />, fab: true },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} />, badge: badges.chats + badges.offers },
  ]
}
