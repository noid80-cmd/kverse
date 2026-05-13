'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getTheme, worldName, groupDisplayName } from '@/lib/groupThemes'
import { useT, useLanguage } from '@/lib/i18n'

type GroupRank = {
  id: string
  name: string
  videoCount: number
  fanCount: number
  score: number
}

const MEDAL_COLORS = ['#FFD700', '#A8A8A8', '#B87333']

export default function FandomRanking() {
  const t = useT()
  const { locale } = useLanguage()
  const [ranking, setRanking] = useState<GroupRank[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [groupsRes, fandomRes] = await Promise.all([
        supabase.from('groups').select('id, name, videos(count)'),
        supabase.from('fandom_members').select('group_name'),
      ])

      if (!groupsRes.data) { setLoading(false); return }

      const fanCounts: Record<string, number> = {}
      for (const row of fandomRes.data || []) {
        fanCounts[row.group_name] = (fanCounts[row.group_name] || 0) + 1
      }

      const ranked = (groupsRes.data as any[])
        .map(g => {
          const videoCount = g.videos?.[0]?.count ?? 0
          const fanCount = fanCounts[g.name] || 0
          return { id: g.id, name: g.name, videoCount, fanCount, score: videoCount * 5 + fanCount }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      setRanking(ranked)
      setLoading(false)
    }
    load()
  }, [])

  const maxScore = ranking[0]?.score || 1

  return (
    <section className="relative px-6 py-20 border-y border-white/5">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-yellow-500/20 mb-4"
            style={{ background: 'rgba(234,179,8,0.08)', color: '#EAB308' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            {t('home.rankingLive')}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{t('home.rankingTitle')}</h2>
          <p className="text-white/30 text-sm font-normal">{t('home.rankingDesc')}</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-10 text-white/20 text-sm font-normal">
            {t('home.rankingEmpty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {ranking.map((group, index) => {
              const theme = getTheme(group.name)
              const accentColor = theme.primary === '#FFFFFF' ? '#C9A96E' : theme.primary
              const barWidth = maxScore > 0 ? Math.max((group.score / maxScore) * 100, 4) : 4
              const isMedal = index < 3
              const initial = groupDisplayName(group.name, 'en').charAt(0).toUpperCase()

              return (
                <div
                  key={group.id}
                  className="relative rounded-2xl px-5 py-4 flex items-center gap-4 border overflow-hidden"
                  style={{
                    borderColor: isMedal ? `${accentColor}35` : `${accentColor}15`,
                    background: isMedal ? `${accentColor}07` : 'rgba(255,255,255,0.02)',
                  }}
                >
                  {/* 배경 바 */}
                  <div
                    className="absolute left-0 top-0 h-full opacity-[0.06] transition-all duration-1000"
                    style={{ width: `${barWidth}%`, background: accentColor }}
                  />

                  {/* 순위 */}
                  <div className="relative z-10 w-8 text-center flex-shrink-0">
                    <span
                      className="text-base font-bold tabular-nums"
                      style={{ color: isMedal ? MEDAL_COLORS[index] : 'rgba(255,255,255,0.25)' }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* 그룹 아이콘 — 이니셜 + 그라디언트 */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: accentColor }}
                    >
                      {initial}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 text-xs leading-none">{theme.emoji}</span>
                  </div>

                  {/* 그룹 정보 */}
                  <div className="relative z-10 flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">
                      {groupDisplayName(group.name, locale)}
                    </p>
                    <p className="text-xs font-normal mt-0.5" style={{ color: `${accentColor}80` }}>
                      {theme.world}
                      {locale === 'ko' && <span className="text-white/20"> · {worldName(theme, locale)}</span>}
                    </p>
                  </div>

                  {/* 활동 지표 */}
                  <div className="relative z-10 text-right flex-shrink-0">
                    <p className="text-white font-semibold text-sm tabular-nums">{group.videoCount} <span className="text-white/30 text-xs font-normal">{t('home.covers')}</span></p>
                    <p className="text-xs tabular-nums mt-0.5" style={{ color: `${accentColor}70` }}>{group.fanCount.toLocaleString()}명 팬</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 py-3 text-center">
          <p className="text-white/15 text-xs font-normal">
            {t('home.rankingLocked', { n: Math.max(0, 21 - 5) })}
          </p>
        </div>
      </div>
    </section>
  )
}
