import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/lib/i18n/context'
import KakaoGuard from '@/components/KakaoGuard'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Kpick — 기획사가 직접 발굴하는 오디션 플랫폼',
    template: '%s | Kpick',
  },
  description: '영상 하나로 전세계 기획사 담당자에게 노출됩니다. K팝 보컬·댄스·연기 오디션의 새로운 방식.',
  keywords: ['K팝 오디션', '기획사 오디션', '연예인 오디션', '댄스 오디션', '보컬 오디션', 'kpop audition', 'K-pop agency'],
  authors: [{ name: 'Kpick' }],
  creator: 'Kpick',
  metadataBase: new URL('https://kpick.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US', 'ja_JP', 'zh_CN'],
    url: 'https://kpick.app',
    siteName: 'Kpick',
    title: 'Kpick — 기획사가 직접 발굴하는 오디션 플랫폼',
    description: '영상 하나로 전세계 기획사 담당자에게 노출됩니다.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kpick' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kpick — 기획사가 직접 발굴하는 오디션 플랫폼',
    description: '영상 하나로 전세계 기획사 담당자에게 노출됩니다.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'H3LVu-byEF_skxSRUkHs49IR2wPYAdUY0whAPouAjpQ',
  },
}

export const viewport: Viewport = {
  themeColor: '#0891b2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={jakarta.className}>
      <head>
        <meta name="google-site-verification" content="H3LVu-byEF_skxSRUkHs49IR2wPYAdUY0whAPouAjpQ" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kpick" />
      </head>
      <body><LangProvider><ServiceWorkerRegister /><KakaoGuard />{children}</LangProvider></body>
    </html>
  )
}
