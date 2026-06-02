'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import PushSubscribe from '@/components/PushSubscribe'
import Link from 'next/link'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

type Profile = { name: string; avatar_url: string | null; bio: string | null }
type Stats = { videos: number; bookmarks: number; contacts: number }

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ videos: 0, bookmarks: 0, contacts: 0 })
  const [recentVideos, setRecentVideos] = useState<{ id: string; title: string; thumbnail_url: string | null; view_count: number; created_at: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [{ data: prof }, { count: vCount }, { count: bCount }, { count: cCount }, { data: vids }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, bio').eq('id', user.id).single(),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('talent_id', user.id).eq('status', 'active'),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('talent_id', user.id),
        supabase.from('videos').select('id, title, thumbnail_url, view_count, created_at').eq('talent_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(3),
      ])
      setProfile(prof)
      setStats({ videos: vCount ?? 0, bookmarks: bCount ?? 0, contacts: cCount ?? 0 })
      setRecentVideos(vids ?? [])
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <PushSubscribe />
      <div className="max-w-lg mx-auto px-4 pt-10">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p style={{ fontSize: 13, color: '#8b8baa', fontWeight: 500, marginBottom: 2 }}>안녕하세요 👋</p>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b' }}>{profile?.name ?? '...'}</h1>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{profile?.name?.[0] ?? 'K'}</span>
            }
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: '영상', value: stats.videos, icon: '🎬', href: '/videos' },
            { label: '관심', value: stats.bookmarks, icon: '⭐', href: '/reactions?tab=bookmarks' },
            { label: '채팅', value: stats.contacts, icon: '💬', href: '/reactions' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 20, padding: '18px 12px',
                textAlign: 'center', border: '1px solid #e8e8f2',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#8b8baa', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* 프로필 완성 유도 */}
        {!profile?.bio && (
          <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: 20, padding: '18px 20px',
              marginBottom: 24, border: '1px solid #c4b5fd', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>✍️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>프로필을 완성해보세요</div>
                <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>자기소개와 특기를 추가하면 기획사에 더 잘 보여요</div>
              </div>
            </div>
          </Link>
        )}

        {/* 최근 영상 */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>최근 업로드</h2>
          <Link href="/videos" style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>전체보기</Link>
        </div>

        {recentVideos.length === 0 ? (
          <Link href="/videos/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center',
              border: '2px dashed #d8d8ec',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>첫 영상을 올려보세요</div>
              <div style={{ fontSize: 13, color: '#8b8baa' }}>기획사 담당자들이 바로 볼 수 있어요</div>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col gap-3">
            {recentVideos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff', borderRadius: 18, padding: '14px 16px',
                  border: '1px solid #e8e8f2', display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                    background: v.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>🎬</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ fontSize: 12, color: '#8b8baa' }}>조회 {v.view_count}회</div>
                  </div>
                  <span style={{ color: '#c0c0d8', fontSize: 18 }}>›</span>
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
