'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { attachNotificationTap } from '@/lib/pushNative'

/**
 * 앱에서 알림을 눌렀을 때 해당 화면으로 보낸다.
 *
 * PushSubscribe는 대시보드·반응 페이지에만 있어서, 알림을 눌러 앱이
 * 콜드 스타트되면 그 페이지에 닿기 전이라 리스너가 등록되지 않는다.
 * 오디션 공고 알림을 눌렀는데 홈에 떨어지면 지원까지 가는 길이 끊기므로
 * 레이아웃에 상주시켜 어느 화면으로 시작하든 잡히게 한다.
 */
export default function NativeNotificationRouter() {
  const router = useRouter()

  useEffect(() => {
    attachNotificationTap((url) => {
      // 외부 링크로 앱 바깥에 튕겨나가지 않도록 내부 경로만 허용한다
      if (url.startsWith('/')) router.push(url)
    }).catch(() => {})
  }, [router])

  return null
}
