'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Video, Bookmark, MessageCircle, User, ChevronRight } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

type Profile = { name: string; avatar_url: string | null; bio: string | null }
type RecentVideo = { id: string; title: string; thumbnail_url: string | null; view_count: number; created_at: string }
type RecentAudition = { id: string; title: string; category: string; deadline: string | null; agency: { name: string } | null }
type PageData = {
  profile: Profile | null
  videos: number
  bookmarks: number
  contacts: number
  recentVideos: RecentVideo[]
  recentAuditions: RecentAudition[]
}

const spinner = (
  <>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>
)

const CACHE_KEY = 'kpick-dashboard-v2'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

export default function DashboardPage() {
  const [data, setData] = useState<PageData | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const [auditionIdx, setAuditionIdx] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }

      const [{ data: prof }, { count: vCount }, { count: bCount }, { count: cCount }, { data: vids }, { data: auds }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single(),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('talent_id', user.id).eq('status', 'active'),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('talent_id', user.id).eq('deleted_by_talent', false),
        supabase.from('videos').select('id, title, thumbnail_url, view_count, created_at').eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(4),
        supabase.from('auditions').select('id, title, category, deadline, agency:agencies(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(8),
      ])

      const fresh: PageData = {
        profile: prof,
        videos: vCount ?? 0,
        bookmarks: bCount ?? 0,
        contacts: cCount ?? 0,
        recentVideos: (vids ?? []) as RecentVideo[],
        recentAuditions: (auds as unknown as RecentAudition[]) ?? [],
      }
      setData(fresh)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    const len = data?.recentAuditions.length ?? 0
    if (len <= 1) return
    const t = setInterval(() => setAuditionIdx(i => (i + 1) % len), 5000)
    return () => clearInterval(t)
  }, [data?.recentAuditions.length])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PushSubscribe />
      {spinner}
    </div>
  )

  const { profile, videos, bookmarks, contacts, recentVideos, recentAuditions } = data

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', paddingBottom: 112, position: 'relative', overflow: 'hidden' }}>
      <PushSubscribe />

      {/* Atmospheric background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600,
          background: 'radial-gradient(ellipse at center top, rgba(6,182,212,0.10) 0%, rgba(8,145,178,0.04) 40%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', right: '-20%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.012) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-10" style={{ position: 'relative', zIndex: 1 }}>

        {/* Profile hero */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Link href="/profile/edit" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 20,
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid rgba(6,182,212,0.3)',
                boxShadow: '0 0 0 4px rgba(6,182,212,0.08)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>{profile?.name?.[0] ?? 'K'}</span>
                }
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#eeeeff', lineHeight: 1.2, marginBottom: 4 }}>
                {profile?.name ?? '...'}
              </h1>
              {profile?.bio
                ? <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{profile.bio}</p>
                : (
                  <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600 }}>+ 자기소개 추가하기</span>
                  </Link>
                )
              }
            </div>
          </div>

          {/* Stats inline */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '12px 16px', gap: 0,
          }}>
            {[
              { label: '영상', value: videos, icon: <Video size={14} />, href: '/videos' },
              { label: '관심', value: bookmarks, icon: <Bookmark size={14} />, href: '/reactions?tab=bookmarks' },
              { label: '채팅', value: contacts, icon: <MessageCircle size={14} />, href: '/reactions' },
            ].map((s, i) => (
              <Link key={s.label} href={s.href} style={{ flex: 1, textDecoration: 'none', textAlign: 'center', position: 'relative' }}>
                {i > 0 && (
                  <div style={{ position: 'absolute', left: 0, top: '10%', height: '80%', width: 1, background: 'rgba(255,255,255,0.07)' }} />
                )}
                <div style={{ fontSize: 20, fontWeight: 900, color: '#eeeeff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#555570', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 500 }}>
                  <span style={{ color: '#22d3ee', opacity: 0.7 }}>{s.icon}</span>
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Auditions — pinned above videos so always visible */}
        {recentAuditions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>열린 오디션</h2>
              <Link href="/dashboard/auditions" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                전체보기 <ChevronRight size={14} />
              </Link>
            </div>
            <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
              <div key={auditionIdx} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 12,
                animation: 'auditSlide 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                  <Megaphone size={18} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {recentAuditions[auditionIdx].title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#8888aa' }}>{recentAuditions[auditionIdx].agency?.name ?? '기획사'}</span>
                    <span style={{ fontSize: 10, color: '#22d3ee', background: 'rgba(6,182,212,0.12)', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      {recentAuditions[auditionIdx].category.split(',').map(c => categoryLabel[c] ?? c).join('·')}
                    </span>
                    {recentAuditions[auditionIdx].deadline && (
                      <span style={{ fontSize: 11, color: '#555570' }}>~{recentAuditions[auditionIdx].deadline}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} color="#333350" />
              </div>
            </Link>
            {recentAuditions.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                {recentAuditions.map((_, i) => (
                  <div key={i} style={{
                    height: 5, borderRadius: 3,
                    width: i === auditionIdx ? 16 : 5,
                    background: i === auditionIdx ? '#0891b2' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.35s ease',
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent videos */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>최근 업로드</h2>
            <Link href="/videos" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>

          {recentVideos.length === 0 ? (
            <Link href="/videos/upload" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '36px 24px', textAlign: 'center',
                border: '1.5px dashed rgba(255,255,255,0.08)',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#22d3ee' }}>
                  <Video size={24} strokeWidth={1.5} />
                </div>
                <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 6, fontSize: 15 }}>첫 영상을 올려보세요</div>
                <div style={{ fontSize: 13, color: '#555570' }}>기획사 담당자들이 바로 볼 수 있어요</div>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(6,182,212,0.12)', borderRadius: 10, padding: '8px 16px', color: '#22d3ee', fontSize: 13, fontWeight: 700 }}>
                  <Plus size={14} strokeWidth={2.5} />
                  영상 올리기
                </div>
              </div>
            </Link>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {recentVideos.map(v => (
                <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{
                      width: '100%', aspectRatio: '16/9', overflow: 'hidden',
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(8,145,178,0.04))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Video size={22} strokeWidth={1.5} color="#2a2a3a" />
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#eeeeff', fontSize: 13, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{v.title}</div>
                      <div style={{ fontSize: 11, color: '#555570' }}>조회 {v.view_count}회</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Profile CTA — only when no bio */}
        {!profile?.bio && (
          <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(6,182,212,0.06)', borderRadius: 16, padding: '14px 16px',
              marginBottom: 16, border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                <User size={16} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 13 }}>프로필을 완성해보세요</div>
                <div style={{ fontSize: 12, color: '#22d3ee', marginTop: 1 }}>자기소개를 추가하면 기획사에 더 잘 보여요</div>
              </div>
              <ChevronRight size={16} color="#22d3ee" />
            </div>
          </Link>
        )}

      </div>

      <style>{`@keyframes auditSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <BottomNav items={talentNav} />
    </div>
  )
}
