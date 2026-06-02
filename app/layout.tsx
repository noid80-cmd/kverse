import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KVERSE — 오디션 영상 플랫폼',
  description: '기획사 담당자가 직접 보는 오디션 영상 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
