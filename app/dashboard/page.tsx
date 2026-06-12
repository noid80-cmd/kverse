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
type RecentAudition = { id: string; title: string; category: string; deadline: string | null; agency: { name: string } | null }
type RecentBookmark = { id: string; created_at: string; video: { id: string; title: string } | null; agency_member: { name: string } | null }
type PageData = {
  profile: Profile | null
  videos: number
  bookmarks: number
  contacts: number
  recentAuditions: RecentAudition[]
  recentBookmarks: RecentBookmark[]
}

const spinner = (
  <>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>
)

const CACHE_KEY = 'kpick-dashboard-v3'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const [data, setData] = useState<PageData | null>(() => {
    try { const c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null } catch { return null }
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }

      const [{ data: prof }, { count: vCount }, { count: bCount }, { count: cCount }, { data: auds }, { data: bms }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single(),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('talent_id', user.id).eq('status', 'active'),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('talent_id', user.id).eq('deleted_by_talent', false),
        supabase.from('auditions').select('id, title, category, deadline, agency:agencies(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(8),
        supabase.from('bookmarks').select('id, created_at, video:videos(id, title), agency_member:profiles!agency_member_id(name)').eq('talent_id', user.id).order('created_at', { ascending: false }).limit(2),
      ])

      const fresh: PageData = {
        profile: prof,
        videos: vCount ?? 0,
        bookmarks: bCount ?? 0,
        contacts: cCount ?? 0,
        recentAuditions: (auds as unknown as RecentAudition[]) ?? [],
        recentBookmarks: (bms as unknown as RecentBookmark[]) ?? [],
      }
      setData(fresh)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}
    }
    load()
  }, [])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PushSubscribe />
      {spinner}
    </div>
  )

  const { profile, videos, bookmarks, contacts, recentAuditions, recentBookmarks } = data

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
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.012) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-10" style={{ position: 'relative', zIndex: 1 }}>

        {/* Profile */}
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
                : <Link href="/profile/edit" style={{ textDecoration: 'none' }}><span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600 }}>+ 자기소개 추가하기</span></Link>
              }
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '12px 16px',
          }}>
            {[
              { label: '관심', value: bookmarks, icon: <Bookmark size={14} />, href: '/reactions?tab=bookmarks', color: '#22d3ee' },
              { label: '채팅', value: contacts, icon: <MessageCircle size={14} />, href: '/reactions', color: '#22d3ee' },
            ].map((s, i) => (
              <Link key={s.label} href={s.href} style={{ flex: 1, textDecoration: 'none', textAlign: 'center', position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: '10%', height: '80%', width: 1, background: 'rgba(255,255,255,0.07)' }} />}
                <div style={{ fontSize: 20, fontWeight: 900, color: '#eeeeff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#555570', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 500 }}>
                  <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* My videos shortcut */}
        {videos === 0 ? (
          <Link href="/videos/upload" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
            <div style={{
              background: 'rgba(6,182,212,0.06)', borderRadius: 16, padding: '18px 16px',
              border: '1.5px dashed rgba(6,182,212,0.25)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                <Plus size={20} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>첫 영상을 올려보세요</div>
                <div style={{ fontSize: 12, color: '#22d3ee', marginTop: 1, opacity: 0.8 }}>기획사 담당자가 바로 볼 수 있어요</div>
              </div>
              <ChevronRight size={16} color="#22d3ee" />
            </div>
          </Link>
        ) : (
          <Link href="/videos" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                <Video size={18} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>내 영상</div>
                <div style={{ fontSize: 12, color: '#555570', marginTop: 1 }}>총 {videos}개 업로드됨</div>
              </div>
              <ChevronRight size={16} color="#333350" />
            </div>
          </Link>
        )}

        {/* Agency interest */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>기획사 관심</h2>
            <Link href="/reactions?tab=bookmarks" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>

          {recentBookmarks.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '28px 20px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#22d3ee' }}>
                <Bookmark size={20} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 4 }}>아직 관심 표시가 없어요</div>
              <div style={{ fontSize: 12, color: '#555570' }}>영상을 올리면 기획사 담당자가 관심 표시를 할 수 있어요</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentBookmarks.map(bm => (
                <Link key={bm.id} href="/reactions?tab=bookmarks" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(8,145,178,0.15))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#22d3ee', fontWeight: 900, fontSize: 15,
                    }}>
                      {bm.agency_member?.name?.[0] ?? 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14 }}>{bm.agency_member?.name ?? '담당자'}</span>
                        <span style={{ fontSize: 10, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '1px 6px', borderRadius: 5, fontWeight: 700 }}>관심</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#555570', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bm.video?.title ?? '영상'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#444460', flexShrink: 0 }}>{timeAgo(bm.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Auditions */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff' }}>열린 오디션</h2>
            <Link href="/dashboard/auditions" style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          {recentAuditions.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '24px 20px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#22d3ee' }}>
                <Megaphone size={20} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 4 }}>현재 열린 오디션이 없어요</div>
              <div style={{ fontSize: 12, color: '#555570' }}>새 오디션이 열리면 알려드릴게요</div>
            </div>
          ) : (
            <Link href="/dashboard/auditions" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#22d3ee' }}>
                  <Megaphone size={18} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {recentAuditions[0].title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#8888aa' }}>{recentAuditions[0].agency?.name ?? '기획사'}</span>
                    <span style={{ fontSize: 10, color: '#22d3ee', background: 'rgba(6,182,212,0.12)', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      {recentAuditions[0].category.split(',').map(c => categoryLabel[c] ?? c).join('·')}
                    </span>
                    {recentAuditions[0].deadline && <span style={{ fontSize: 11, color: '#555570' }}>~{recentAuditions[0].deadline}</span>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, fontSize: 11, color: '#555570', textAlign: 'right' }}>
                  <div style={{ color: '#22d3ee', fontWeight: 700 }}>{recentAuditions.length}개</div>
                  <div>진행중</div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Profile CTA */}
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

          <BottomNav items={talentNav} />
    </div>
  )
}
