'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, User, Video, Bookmark, MessageCircle, Megaphone } from 'lucide-react'

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
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>
)

const CACHE_KEY = 'kverse-dashboard-v2'

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
        supabase.from('videos').select('id, title, thumbnail_url, view_count, created_at').eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(3),
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
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PushSubscribe />
      {spinner}
    </div>
  )

  const { profile, videos, bookmarks, contacts, recentVideos, recentAuditions } = data

  const categoryLabel: Record<string, string> = {
    vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <PushSubscribe />
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff' }}>{profile?.name ?? '...'}</h1>
          </div>
          <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{profile?.name?.[0] ?? 'K'}</span>
              }
            </div>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: '영상', value: videos, icon: <Video size={16} strokeWidth={2} />, href: '/videos', color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
            { label: '관심', value: bookmarks, icon: <Bookmark size={16} strokeWidth={2} />, href: '/reactions?tab=bookmarks', color: '#f472b6', bg: 'rgba(236,72,153,0.12)' },
            { label: '채팅', value: contacts, icon: <MessageCircle size={16} strokeWidth={2} />, href: '/reactions', color: '#38bdf8', bg: 'rgba(14,165,233,0.12)' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#111118', borderRadius: 18, padding: '16px 10px 14px',
                textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#555570', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {!profile?.bio && (
          <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(99,102,241,0.1)', borderRadius: 20, padding: '18px 20px',
              marginBottom: 24, border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#818cf8' }}>
                <User size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>프로필을 완성해보세요</div>
                <div style={{ fontSize: 12, color: '#818cf8', marginTop: 2 }}>자기소개와 특기를 추가하면 기획사에 더 잘 보여요</div>
              </div>
            </div>
          </Link>
        )}

        {recentAuditions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>열린 오디션</h2>
              <Link href="/dashboard/auditions" style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>전체보기</Link>
            </div>
            <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
              <div key={auditionIdx} style={{
                background: '#111118', borderRadius: 16, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 12,
                animation: 'auditSlide 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#818cf8' }}>
                  <Megaphone size={18} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recentAuditions[auditionIdx].title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#8888aa' }}>{recentAuditions[auditionIdx].agency?.name ?? '기획사'}</span>
                    <span style={{ fontSize: 10, color: '#818cf8', background: 'rgba(99,102,241,0.12)', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      {recentAuditions[auditionIdx].category.split(',').map(c => categoryLabel[c] ?? c).join('·')}
                    </span>
                    {recentAuditions[auditionIdx].deadline && <span style={{ fontSize: 11, color: '#555570' }}>~{recentAuditions[auditionIdx].deadline}</span>}
                  </div>
                </div>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#333350" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </Link>
            {recentAuditions.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                {recentAuditions.map((_, i) => (
                  <div key={i} style={{
                    height: 6, borderRadius: 3,
                    width: i === auditionIdx ? 18 : 6,
                    background: i === auditionIdx ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.35s ease',
                  }} />
                ))}
              </div>
            )}
            <style>{`@keyframes auditSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>최근 업로드</h2>
          <Link href="/videos" style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>전체보기</Link>
        </div>

        {recentVideos.length === 0 ? (
          <Link href="/videos/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#111118', borderRadius: 20, padding: '32px 24px', textAlign: 'center',
              border: '1.5px dashed rgba(255,255,255,0.1)',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#818cf8' }}>
                <Video size={22} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 4, fontSize: 15 }}>첫 영상을 올려보세요</div>
              <div style={{ fontSize: 13, color: '#555570' }}>기획사 담당자들이 바로 볼 수 있어요</div>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col gap-3">
            {recentVideos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111118', borderRadius: 16, padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 80, height: 60, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Video size={18} strokeWidth={1.5} color="#4a4a6a" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#eeeeff', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ fontSize: 12, color: '#555570' }}>조회 {v.view_count}회</div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#333350" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}
