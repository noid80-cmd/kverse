'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import AgencyNav from '@/components/layout/AgencyNav'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Video = {
  id: string; title: string; description: string | null; video_url: string | null
  thumbnail_url: string | null; view_count: number; category: string; tags: string[]; created_at: string
  talent: {
    id: string; name: string; avatar_url: string | null; bio: string | null
    birth_date: string | null; gender: string | null; height: number | null; weight: number | null; skills: string[]
  } | null
}

export default function AgencyVideoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [myId, setMyId] = useState('')
  const [myAgencyId, setMyAgencyId] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [showContact, setShowContact] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
      setMyAgencyId(am?.agency_id ?? '')

      const { data: v } = await supabase.from('videos').select(`
        id, title, description, video_url, thumbnail_url, view_count, category, tags, created_at,
        talent:profiles!talent_id(id, name, avatar_url, bio, birth_date, gender, height, weight, skills)
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
    }
    setBookmarked(b => !b)
  }

  async function handleContact() {
    if (!contactMsg.trim() || !video?.talent || !myAgencyId) return
    setSending(true)
    await supabase.from('contacts').insert({
      agency_id: myAgencyId, sender_id: myId, talent_id: video.talent.id, message: contactMsg.trim(),
    })
    await supabase.from('notifications').insert({
      user_id: video.talent.id, type: 'contact',
      title: '기획사에서 연락이 왔어요', body: contactMsg.trim().substring(0, 80), link: '/reactions',
    })
    setSending(false); setSent(true); setShowContact(false); setContactMsg('')
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    return new Date().getFullYear() - new Date(birth).getFullYear()
  }

  if (!video) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f8', color: '#8b8baa' }}>
      불러오는 중...
    </div>
  )

  const t = video.talent

  return (
    <>
      <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
        <div className="max-w-lg mx-auto px-4 pt-10">

          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{video.title}</span>
            <button onClick={toggleBookmark}
              style={{ width: 40, height: 40, borderRadius: 12, fontSize: 20, background: bookmarked ? '#fef9c3' : '#fff', border: '1px solid #e0e0f0' }}>
              {bookmarked ? '⭐' : '☆'}
            </button>
          </div>

          {/* 영상 */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            {video.video_url ? (
              <video src={video.video_url} controls style={{ width: '100%', maxHeight: 300, display: 'block' }}
                poster={video.thumbnail_url ?? undefined} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>영상 준비 중...</div>
            )}
          </div>

          {/* 태그/카테고리 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category]}
            </span>
            {video.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>

          {/* 지망생 프로필 카드 */}
          {t && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18, flexShrink: 0, overflow: 'hidden',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>{t.name[0]}</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 18 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#8b8baa' }}>
                    {[getAge(t.birth_date) && `${getAge(t.birth_date)}세`, t.gender === 'male' ? '남' : t.gender === 'female' ? '여' : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {(t.height || t.weight) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  {t.height && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#6366f1', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>키 {t.height}cm</span>}
                  {t.weight && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#6366f1', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>몸무게 {t.weight}kg</span>}
                </div>
              )}

              {t.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: t.bio ? 12 : 0 }}>
                  {t.skills.map(s => (
                    <span key={s} style={{ fontSize: 12, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#7c3aed', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              )}

              {t.bio && <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, background: '#f8f7ff', borderRadius: 12, padding: '12px 14px' }}>{t.bio}</p>}
            </div>
          )}

          {/* 연락 성공 메시지 */}
          {sent && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 16, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>연락이 전송됐어요</span>
            </div>
          )}

          {/* 연락 버튼 */}
          {!sent && (
            <button onClick={() => setShowContact(true)}
              className="w-full py-4 rounded-2xl text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              💌 연락하기
            </button>
          )}
        </div>
      </div>

      {/* 연락 모달 */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(30,27,75,0.3)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowContact(false) }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <h3 style={{ fontWeight: 800, color: '#1e1b4b', fontSize: 18, marginBottom: 6 }}>연락 보내기</h3>
            <p style={{ fontSize: 13, color: '#8b8baa', marginBottom: 16 }}>{t?.name}님에게 연락이 전달돼요</p>
            <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)}
              placeholder="안녕하세요. 영상을 인상 깊게 봤습니다..." rows={5}
              style={{ width: '100%', background: '#f8f7ff', border: '1px solid #e0e0f0', borderRadius: 16, padding: '14px 16px', fontSize: 15, color: '#1e1b4b', resize: 'none', marginBottom: 14, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowContact(false)}
                style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e0e0f0', background: 'none', color: '#8b8baa', fontWeight: 700, fontSize: 15 }}>
                취소
              </button>
              <button onClick={handleContact} disabled={sending || !contactMsg.trim()}
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 15, opacity: (!contactMsg.trim() || sending) ? 0.5 : 1 }}>
                {sending ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AgencyNav />
    </>
  )
}
