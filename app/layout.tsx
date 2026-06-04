import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KVERSE',
  description: '기획사 담당자가 직접 보는 오디션 영상 플랫폼',
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KVERSE" />
      </head>
      <body>{children}</body>
    </html>
  )
}
