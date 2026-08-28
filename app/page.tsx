import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: 'Krookie — 매주 새로운 오디션에 지원하세요',
  description: '기획사가 직접 여는 온라인 오디션. 갖고 있는 영상 하나로 지원하고 결과는 앱에서 받아보세요.',
  openGraph: {
    title: 'Krookie — 매주 새로운 오디션에 지원하세요',
    description: '기획사가 직접 여는 온라인 오디션. 영상 하나로 지원하세요.',
    url: 'https://kpick.app',
  },
}

export default function LandingPage() {
  return <LandingClient />
}
