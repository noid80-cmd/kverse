'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone, Heart, Video, MessageCircle } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Talent = {
  id: string; name: string; avatar_url: string | null; bio: string | null
  birth_date: string | null; gender: string | null; height: number | null; weight: number | null
  skills: string[]; nationality: string | null
}
type VideoItem = { id: string; title: string; thumbnail_url: string | null; view_count: number; like_count: number; category: string }

export default function TalentPublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [talent, setTalent] = useState<Talent | null>(null)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [myRole, setMyRole] = useState('')
  const [myId, setMyId] = useState('')
  const [convId, setConvId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setMyRole(profile?.role ?? 'talent')

      const isAgency = profile?.role === 'agency'
      const profileFields = isAgency
        ? 'id, name, avatar_url, bio, birth_date, gender, height, weight, skills, nationality'
        : 'id, name, avatar_url'

      const [{ data: t }, { data: v }] = await Promise.all([
        supabase.from('profiles').select(profileFields).eq('id', id).single(),
        supabase.from('videos').select('id, title, thumbnail_url, view_count, like_count, category').eq('talent_id', id).eq('status', 'active').order('created_at', { ascending: false }),
      ])

      setTalent(t as unknown as Talent)
      setVideos((v as unknown as VideoItem[]) ?? [])

      if (profile?.role === 'agency') {
        const { data: conv } = await supabase.from('conversations').select('id').eq('agency_member_id', user.id).eq('talent_id', id).eq('deleted_by_agency', false).maybeSingle()
        if (conv) setConvId(conv.id)
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleChat() {
    if (convId) { router.push(`/chat/${convId}`); return }
    setStarting(true)
    const { data } = await supabase.from('conversations').insert({ agency_member_id: myId, talent_id: id }).select('id').single()
    if (data) {
      const { data: ag } = await supabase.from('agency_members').select('agencies(name)').eq('profile_id', myId).single()
      const agName = (ag?.agencies as unknown as { name: string } | null)?.name ?? '기획사'
      fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, title: '채팅 요청', body: `${agName}에서 채팅을 시작했어요`, url: '/reactions' }) })
      router.push(`/chat/${data.id}`)
      return
    }
    alert('채팅을 시작할 수 없어요.')
    setStarting(false)
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    return new Date().getFullYear() - new Date(birth).getFullYear()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>불러오는 중...</div>
  )

  if (!talent) return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>프로필을 찾을 수 없어요</div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8888aa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#eeeeff' }}>프로필</span>
        </div>

        {/* 프로필 카드 */}
        <div style={{ background: '#111118', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, flexShrink: 0, overflow: 'hidden',
              background: 'rgba(6,182,212,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {talent.avatar_url
                ? <img src={talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#22d3ee', fontWeight: 900, fontSize: 26 }}>{talent.name?.[0] ?? '?'}</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 900, color: '#eeeeff', fontSize: 22, marginBottom: 4 }}>{talent.name}</div>
              <div style={{ fontSize: 14, color: '#8888aa' }}>
                {[
                  getAge(talent.birth_date) && `${getAge(talent.birth_date)}세`,
                  talent.gender === 'male' ? '남성' : talent.gender === 'female' ? '여성' : null,
                  talent.nationality,
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {myRole === 'agency' && (talent.height || talent.weight) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {talent.height && <span style={{ fontSize: 13, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>키 {talent.height}cm</span>}
              {talent.weight && <span style={{ fontSize: 13, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>몸무게 {talent.weight}kg</span>}
            </div>
          )}

          {myRole === 'agency' && talent.skills?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: talent.bio ? 16 : 0 }}>
              {talent.skills.map(s => (
                <span key={s} style={{ fontSize: 13, background: 'rgba(8,145,178,0.12)', color: '#a78bfa', padding: '5px 12px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
              ))}
            </div>
          )}

          {myRole === 'agency' && talent.bio && (
            <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.7, background: '#1a1a25', borderRadius: 14, padding: '14px 16px', margin: 0 }}>{talent.bio}</p>
          )}
        </div>

        {/* 채팅 버튼 (기획사만) */}
        {myRole === 'agency' && (
          <button onClick={handleChat} disabled={starting}
            style={{
              width: '100%', padding: '16px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white',
              fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
              marginBottom: 24, opacity: starting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <MessageCircle size={18} strokeWidth={2} />
            {starting ? '연결 중...' : convId ? '채팅 이어가기' : '채팅하기'}
          </button>
        )}

        {/* 영상 목록 */}
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#eeeeff', marginBottom: 14 }}>올린 영상 {videos.length}개</h2>
        {videos.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 18, padding: 32, textAlign: 'center', border: '1.5px dashed rgba(255,255,255,0.08)', color: '#555570', fontSize: 14 }}>
            아직 올린 영상이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#111118', borderRadius: 18, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                    background: 'rgba(6,182,212,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Video size={22} strokeWidth={1.5} color="#22d3ee" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#eeeeff', fontSize: 14, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#22d3ee', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{categoryLabel[v.category] ?? v.category}</span>
                      <span style={{ fontSize: 12, color: '#555570' }}>조회 {v.view_count}회</span>
                      <span style={{ fontSize: 12, color: '#555570', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Heart size={11} strokeWidth={2} color="#f43f5e" fill="#f43f5e" /> {v.like_count}
                      </span>
                    </div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#555570" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
