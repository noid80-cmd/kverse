'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'
import { MessageCircle, Video, Heart } from 'lucide-react'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Talent = {
  id: string; name: string; avatar_url: string | null; bio: string | null
  birth_date: string | null; gender: string | null; height: number | null; weight: number | null; skills: string[]; nationality: string | null
}
type Video = { id: string; title: string; thumbnail_url: string | null; view_count: number; like_count: number; category: string }

export default function TalentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [talent, setTalent] = useState<Talent | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [myId, setMyId] = useState('')
  const [convId, setConvId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'agency') { router.replace('/dashboard'); return }

      setMyId(user.id)

      const [{ data: t }, { data: v }, { data: conv }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url, bio, birth_date, gender, height, weight, skills, nationality').eq('id', id).single(),
        supabase.from('videos').select('id, title, thumbnail_url, view_count, like_count, category').eq('talent_id', id).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('conversations').select('id').eq('agency_member_id', user.id).eq('talent_id', id).eq('deleted_by_agency', false).single(),
      ])

      setTalent(t as unknown as Talent)
      setVideos((v as unknown as Video[]) ?? [])
      if (conv) setConvId(conv.id)
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

  if (!talent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f8', color: '#8b8baa' }}>
      불러오는 중...
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b' }}>프로필</span>
        </div>

        {/* 프로필 카드 */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #e8e8f2', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {talent.avatar_url
                ? <img src={talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 26 }}>{talent.name[0]}</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 22, marginBottom: 4 }}>{talent.name}</div>
              <div style={{ fontSize: 14, color: '#8b8baa' }}>
                {[
                  getAge(talent.birth_date) && `${getAge(talent.birth_date)}세`,
                  talent.gender === 'male' ? '남성' : talent.gender === 'female' ? '여성' : null,
                  talent.nationality,
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {(talent.height || talent.weight) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {talent.height && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#6366f1', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>키 {talent.height}cm</span>}
              {talent.weight && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#6366f1', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>몸무게 {talent.weight}kg</span>}
            </div>
          )}

          {talent.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: talent.bio ? 16 : 0 }}>
              {talent.skills.map(s => (
                <span key={s} style={{ fontSize: 13, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#7c3aed', padding: '5px 12px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
              ))}
            </div>
          )}

          {talent.bio && (
            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, background: '#f8f7ff', borderRadius: 14, padding: '14px 16px', margin: 0 }}>{talent.bio}</p>
          )}
        </div>

        {/* 채팅 버튼 */}
        <button onClick={handleChat} disabled={starting}
          style={{
            width: '100%', padding: '16px', borderRadius: 18, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
            fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            marginBottom: 24, opacity: starting ? 0.7 : 1,
          }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <MessageCircle size={18} strokeWidth={2} />
            {starting ? '연결 중...' : convId ? '채팅 이어가기' : '채팅하기'}
          </span>
        </button>

        {/* 영상 목록 */}
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', marginBottom: 14 }}>올린 영상 {videos.length}개</h2>
        {videos.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, textAlign: 'center', border: '2px dashed #d8d8ec', color: '#b0b0cc', fontSize: 14 }}>
            아직 올린 영상이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/agency/discover/${v.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                    background: v.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Video size={22} strokeWidth={1.5} color="#a5b4fc" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{categoryLabel[v.category]}</span>
                      <span style={{ fontSize: 12, color: '#b0b0cc' }}>조회 {v.view_count}회</span>
                      <span style={{ fontSize: 12, color: '#b0b0cc', display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={11} strokeWidth={2} color="#f87171" fill="#f87171" /> {v.like_count}</span>
                    </div>
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <AgencyNav />
    </div>
  )
}
