'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GROUP_THEMES, groupDisplayName } from '@/lib/groupThemes'
import FandomRanking from './components/FandomRanking'
import { useT, useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'
import { getAuthUser } from '@/lib/supabase'

const ALL_WORLDS = Object.entries(GROUP_THEMES).map(([name, theme]) => ({
  name,
  world: theme.world,
  emoji: theme.emoji,
  gradient: theme.gradient,
  primary: theme.primary,
}))

const BRAND_GRADIENT = 'linear-gradient(135deg, #E91E8C, #7B2FBE)'

// 로고 + h1 두 번째 줄에만 사용
const BRAND_TEXT: React.CSSProperties = {
  background: 'linear-gradient(135deg, #E91E8C 0%, #A855F7 50%, #7B2FBE 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

export default function Home() {
  const t = useT()
  const { locale } = useLanguage()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    getAuthUser().then(u => setLoggedIn(!!u))
  }, [])

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-hidden">

      {/* 네비게이션 */}
      <nav className="grid grid-cols-3 items-center px-4 md:px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
        <div className="flex justify-center">
          <KverseLogo size="lg" />
        </div>
        <div className="flex items-center justify-end gap-2">
          {loggedIn ? (
            <Link href="/feed"
              className="px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition whitespace-nowrap"
              style={{ background: BRAND_GRADIENT }}>
              내 SNS
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="hidden sm:block px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-white/50 hover:text-white hover:border-white/25 transition">
                {t('auth.login')}
              </Link>
              <Link href="/signup"
                className="px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition whitespace-nowrap"
                style={{ background: BRAND_GRADIENT }}>
                {t('home.enterUniverse')}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* 히어로 */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 gap-7">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-white/10 text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
          {t('home.welcome')}
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black leading-[1.1] tracking-tight max-w-4xl break-keep">
          {t('home.heroTitle').split('\n')[0]}
          <br />
          <span style={BRAND_TEXT}>{t('home.heroTitle').split('\n')[1]}</span>
        </h1>

        <p className="text-[15px] text-white/35 max-w-md leading-[1.8] font-normal break-keep">
          {t('home.heroDesc').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </p>

        <div className="flex gap-3">
          <Link href={loggedIn ? '/feed' : '/signup'}
            className="px-8 py-3.5 rounded-full font-medium text-[15px] hover:opacity-90 transition"
            style={{ background: BRAND_GRADIENT }}>
            {loggedIn ? t('home.enterUniverse') : t('home.startUniverse')}
          </Link>
          <Link href="/browse"
            className="px-8 py-3.5 rounded-full border border-white/10 font-medium text-[15px] text-white/50 hover:text-white hover:border-white/25 transition">
            {t('home.viewCovers')}
          </Link>
        </div>
      </section>

      {/* 유니버스 카드 */}
      <section className="relative px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-white/25 text-xs font-medium tracking-[0.2em] uppercase mb-4">{t('home.universeDesc')}</p>
          <h2 className="text-3xl font-bold text-white">{t('home.whichUniverse')}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ALL_WORLDS.map((w) => (
            <Link
              key={w.name}
              href={`/universe/${encodeURIComponent(w.name)}`}
              className="relative overflow-hidden rounded-2xl group cursor-pointer hover:scale-[1.03] transition-all duration-300"
              style={{ aspectRatio: '4/3' }}
            >
              <div className="absolute inset-0" style={{ background: w.gradient }} />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-300" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }} />
              <div className="absolute bottom-0 right-3 text-[7rem] font-black leading-none select-none pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.07)' }}>
                {w.world.charAt(0)}
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end p-5">
                <p className="text-white/55 text-xs font-medium tracking-widest uppercase mb-1">
                  {groupDisplayName(w.name, locale)}
                </p>
                <h3 className="text-base font-semibold text-white leading-snug">{w.world}</h3>
              </div>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }} />
            </Link>
          ))}
        </div>
      </section>

      {/* 팬덤 랭킹 */}
      <FandomRanking />

      {/* 기능 */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-white/25 text-xs font-medium tracking-[0.2em] uppercase mb-4">{t('home.whatYouCan')}</p>
            <h2 className="text-3xl font-bold text-white">
              Kverse <span style={{ color: '#E91E8C' }}>Universe</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { num: '01', title: t('home.feat1Title'), desc: t('home.feat1Desc') },
              { num: '02', title: t('home.feat2Title'), desc: t('home.feat2Desc') },
              { num: '03', title: t('home.feat3Title'), desc: t('home.feat3Desc') },
              { num: '04', title: t('home.feat4Title'), desc: t('home.feat4Desc') },
            ].map((item) => (
              <div key={item.title}
                className="flex gap-4 p-6 rounded-2xl border border-white/6 transition-colors hover:border-white/8"
                style={{ background: 'rgba(255,255,255,0.025)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold tabular-nums"
                  style={{ background: 'rgba(233,30,140,0.12)', color: '#E91E8C' }}>
                  {item.num}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1.5 text-[15px]">{item.title}</h3>
                  <p className="text-white/35 text-sm leading-relaxed font-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6 border-t border-white/5">
        <p className="text-white/45 text-xs font-medium tracking-[0.2em] uppercase">{t('home.ctaDesc')}</p>
        <h2 className="text-4xl sm:text-5xl font-bold text-white break-keep">{t('home.ctaTitle')}</h2>
        <Link href={loggedIn ? '/feed' : '/signup'}
          className="px-12 py-4 rounded-full font-medium text-base hover:opacity-90 transition"
          style={{ background: BRAND_GRADIENT }}>
          {loggedIn ? t('home.enterUniverse') : t('home.ctaBtn')}
        </Link>
      </section>

      <footer className="border-t border-white/5 px-8 py-10 text-center">
        <p className="text-white/35 text-sm font-normal mb-4">© 2026 Kverse — K-pop Universe. All rights reserved.</p>
        <p className="text-white/25 text-xs max-w-2xl mx-auto leading-relaxed font-normal">
          Kverse is an independent fan community platform and is not affiliated with, endorsed by, or officially connected to
          any K-pop artist, entertainment company, or their management. All artist names, group names, logos, and related
          intellectual property belong to their respective owners. Cover videos uploaded by users are fan-created content
          for non-commercial purposes only.
        </p>
        <p className="text-white/25 text-xs mt-2 font-normal">
          Kverse는 K팝 아티스트 및 소속사와 무관한 독립 팬 커뮤니티 플랫폼입니다.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/privacy" className="text-white/25 hover:text-white/50 text-xs transition">개인정보처리방침 · Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
