'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Bookmark, MessageCircle } from 'lucide-react'
import AgencyNav from '@/components/layout/AgencyNav'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Video = {
  id: string; title: string; description: string | null; video_url: string | null
  thumbnail_url: string | null; view_count: number; category: string; tags: string[]; created_at: string
  talent: {
    id: string; name: string; avatar_url: string | null; bio: string | null
    birth_date: string | null; gender: string | null; height: number | null; weight: number | null; skills: string[]; nationality: string | null
  } | null
}

export default function AgencyVideoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [myId, setMyId] = useState('')
  const [myAgencyId, setMyAgencyId] = useState('')
  const [starting, setStarting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'agency' && profile?.role !== 'admin') { router.replace('/dashboard'); return }

      setMyId(user.id)

      const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
      setMyAgencyId(am?.agency_id ?? '')

      const { data: v } = await supabase.from('videos').select(`
        id, title, description, video_url, thumbnail_url, view_count, category, tags, created_at,
        talent:profiles!talent_id(id, name, avatar_url, bio, birth_date, gender, height, weight, skills, nationality)
      `).eq('id', id).single()
      if (!v) { router.back(); return }
      setVideo(v as unknown as Video)

      const { data: bm } = await supabase.from('bookmarks').select('id').eq('agency_member_id', user.id).eq('video_id', id).single()
      setBookmarked(!!bm)

      // 조회수 증가
      await supabase.from('videos').update({ view_count: (v as unknown as Video).view_count + 1 }).eq('id', id)
    }
    load()
  }, [id])

  async function toggleBookmark() {
    if (!video?.talent) return
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('agency_member_id', myId).eq('video_id', video.id)
    } else {
      await supabase.from('bookmarks').insert({ agency_member_id: myId, talent_id: video.talent.id, video_id: video.id })
      const { data: ag } = await supabase.from('agency_members').select('agencies(name)').eq('profile_id', myId).single()
      const agName = (ag?.agencies as unknown as { name: string } | null)?.name ?? '기획사'
      fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: video.talent.id, title: '관심 표시', body: `${agName}이 내 영상을 관심 목록에 추가했어요`, url: '/reactions?tab=bookmarks' }) })
    }
    setBookmarked(b => !b)
  }

  async function handleStartChat() {
    if (!video?.talent) return
    setStarting(true)
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('agency_member_id', myId).eq('talent_id', video.talent.id).eq('deleted_by_agency', false).single()
    if (existing) { setStarting(false); router.push(`/chat/${existing.id}`); return }
    const { data: newConv, error: convErr } = await supabase
      .from('conversations').insert({ agency_member_id: myId, talent_id: video.talent.id })
      .select('id').single()
    if (newConv) {
      const { data: ag } = await supabase.from('agency_members').select('agencies(name)').eq('profile_id', myId).single()
      const agName = (ag?.agencies as unknown as { name: string } | null)?.name ?? '기획사'
      fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: video.talent.id, title: '채팅 요청', body: `${agName}에서 채팅을 시작했어요`, url: '/reactions' }) })
      router.push(`/chat/${newConv.id}`)
      return
    }
    alert('채팅 오류: ' + (convErr?.message ?? '알 수 없는 오류'))
    setStarting(false)
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    return new Date().getFullYear() - new Date(birth).getFullYear()
  }

  if (!video) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f', color: '#555570' }}>
      불러오는 중...
    </div>
  )

  const t = video.talent

  return (
    <>
      <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
        <div className="max-w-lg mx-auto px-4 pt-10">

          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} style={{ fontSize: 22, color: '#555570', background: 'none', border: 'none', padding: 0 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#eeeeff', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{video.title}</span>
            <button onClick={toggleBookmark}
              style={{ width: 40, height: 40, borderRadius: 12, background: bookmarked ? 'rgba(251,191,36,0.15)' : '#111118', border: `1px solid ${bookmarked ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: bookmarked ? '#fbbf24' : '#555570' }}>
              <Bookmark size={18} strokeWidth={2} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* 영상 */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {video.video_url ? (
              <video src={video.video_url} controls style={{ width: '100%', maxHeight: 300, display: 'block' }}
                poster={video.thumbnail_url ?? undefined} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>영상 준비 중...</div>
            )}
          </div>

          {/* 태그/카테고리 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, background: 'rgba(6,182,212,0.15)', color: '#22d3ee', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category]}
            </span>
            {video.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: 'rgba(168,85,247,0.12)', color: '#a78bfa', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>

          {/* 지망생 프로필 카드 */}
          {t && (
            <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18, flexShrink: 0, overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>{t.name[0]}</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#eeeeff', fontSize: 18 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#8888aa' }}>
                    {[getAge(t.birth_date) && `${getAge(t.birth_date)}세`, t.gender === 'male' ? '남' : t.gender === 'female' ? '여' : null, t.nationality].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {(t.height || t.weight) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  {t.height && <span style={{ fontSize: 13, background: 'rgba(6,182,212,0.1)', color: '#22d3ee', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>키 {t.height}cm</span>}
                  {t.weight && <span style={{ fontSize: 13, background: 'rgba(6,182,212,0.1)', color: '#22d3ee', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>몸무게 {t.weight}kg</span>}
                </div>
              )}

              {t.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: t.bio ? 12 : 0 }}>
                  {t.skills.map(s => (
                    <span key={s} style={{ fontSize: 12, background: 'rgba(168,85,247,0.15)', color: '#a78bfa', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              )}

              {t.bio && <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.6, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>{t.bio}</p>}
            </div>
          )}

          <button onClick={handleStartChat} disabled={starting}
            className="w-full py-4 rounded-2xl text-white transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(6,182,212,0.3)', opacity: starting ? 0.7 : 1 }}>
            {starting ? '연결 중...' : '채팅하기'}
          </button>
        </div>
      </div>


      <AgencyNav />
    </>
  )
}
