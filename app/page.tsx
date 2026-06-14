import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: 'Kpick — 기획사가 직접 발굴하는 오디션 플랫폼',
  description: '영상 하나로 전세계 기획사 담당자에게 노출됩니다. K팝 보컬·댄스·연기 오디션의 새로운 방식.',
  openGraph: {
    title: 'Kpick — 기획사가 직접 발굴하는 오디션 플랫폼',
    description: '영상 하나로 전세계 기획사 담당자에게 노출됩니다.',
    url: 'https://kpick.app',
  },
}

export default function LandingPage() {
  return <LandingClient />
}
