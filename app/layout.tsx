import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/lib/i18n/context'
import KakaoGuard from '@/components/KakaoGuard'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import NativeSessionSync from '@/components/NativeSessionSync'
import NativeNotificationRouter from '@/components/NativeNotificationRouter'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Krookie — 매주 새로운 오디션에 지원하세요',
    template: '%s | Krookie',
  },
  description: '기획사가 직접 여는 온라인 오디션. 갖고 있는 영상 하나로 지원하고 결과는 앱에서 받아보세요.',
  keywords: ['온라인 오디션', 'K팝 오디션', '기획사 오디션', '연예인 오디션', '댄스 오디션', '보컬 오디션', 'kpop audition', 'online audition'],
  authors: [{ name: 'Krookie' }],
  creator: 'Krookie',
  metadataBase: new URL('https://kpick.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US', 'ja_JP', 'zh_CN'],
    url: 'https://kpick.app',
    siteName: 'Krookie',
    title: 'Krookie — 매주 새로운 오디션에 지원하세요',
    description: '기획사가 직접 여는 온라인 오디션. 영상 하나로 지원하세요.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Krookie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Krookie — 매주 새로운 오디션에 지원하세요',
    description: '기획사가 직접 여는 온라인 오디션. 영상 하나로 지원하세요.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'H3LVu-byEF_skxSRUkHs49IR2wPYAdUY0whAPouAjpQ',
  },
}

export const viewport: Viewport = {
  themeColor: '#D84A1E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={jakarta.className}>
      <head>
        <meta name="google-site-verification" content="H3LVu-byEF_skxSRUkHs49IR2wPYAdUY0whAPouAjpQ" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Krookie" />
      </head>
      <body><LangProvider><ServiceWorkerRegister /><KakaoGuard /><NativeSessionSync /><NativeNotificationRouter />{children}<Analytics /></LangProvider></body>
    </html>
  )
}
