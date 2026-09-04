'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Bookmark, MessageCircle, Lock } from 'lucide-react'
import { checkContactAccess } from '@/lib/contactGate'
import AgencyNav from '@/components/layout/AgencyNav'
import { sendPush } from '@/lib/notify'

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
  // 기본값은 잠금. 판정 전에 잠깐이라도 열려 보이면 안 된다.
  const [canContact, setCanContact] = useState(false)
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
        talent:profiles!talent_id(id, name, avatar_url, birth_date, gender, height, weight, skills, nationality)
      `).eq('id', id).single()
      if (!v) { router.back(); return }
      setVideo(v as unknown as Video)

      const { data: bm } = await supabase.from('bookmarks').select('id').eq('agency_member_id', user.id).eq('video_id', id).single()
      setBookmarked(!!bm)

      // 자기소개 전문은 사실상 외부 연락처라, 자격이 확인된 뒤에만 따로 가져온다.
      // 화면에서만 가리면 네트워크 탭에 그대로 남는다.
      const talentId = (v as unknown as Video).talent?.id
      if (talentId) {
        const access = await checkContactAccess(supabase, {
          agencyMemberId: user.id,
          agencyId: am?.agency_id ?? null,
          talentId,
        })
        setCanContact(access.allowed)
        if (access.allowed) {
          const { data: full } = await supabase.from('profiles').select('bio').eq('id', talentId).single()
          if (full?.bio) {
            setVideo(prev => (prev && prev.talent
              ? { ...prev, talent: { ...prev.talent, bio: full.bio as string } }
              : prev))
          }
        }
      }

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
      sendPush({ userId: video.talent.id, title: '관심 표시', body: `${agName}이 내 영상을 관심 목록에 추가했어요`, url: '/reactions?tab=bookmarks' })
    }
    setBookmarked(b => !b)
  }

  async function handleStartChat() {
    if (!video?.talent) return
    if (!canContact) return
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
      sendPush({ userId: video.talent.id, title: '채팅 요청', body: `${agName}에서 채팅을 시작했어요`, url: '/reactions' })
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8E7', color: '#8A7F6E' }}>
      불러오는 중...
    </div>
  )

  const t = video.talent

  return (
    <>
      <div className="min-h-screen pb-28" style={{ background: '#FFF8E7' }}>
        <div className="max-w-lg mx-auto px-4 pt-10">

          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8A7F6E', background: 'none', border: 'none', padding: 0 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#241C15', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{video.title}</span>
            <button onClick={toggleBookmark}
              style={{ width: 40, height: 40, borderRadius: 12, background: bookmarked ? 'rgba(251,191,36,0.15)' : '#FFFFFF', border: `1px solid ${bookmarked ? 'rgba(251,191,36,0.4)' : 'rgba(36,28,21,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: bookmarked ? '#fbbf24' : '#8A7F6E' }}>
              <Bookmark size={18} strokeWidth={2} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* 영상 */}
          <div style={{ borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {video.video_url ? (
              <video src={video.video_url} controls style={{ width: '100%', maxHeight: 300, display: 'block' }}
                poster={video.thumbnail_url ?? undefined} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7F6E' }}>영상 준비 중...</div>
            )}
          </div>

          {/* 태그/카테고리 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, background: 'rgba(255,111,60,0.15)', color: '#D84A1E', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {categoryLabel[video.category]}
            </span>
            {video.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: 'rgba(168,85,247,0.12)', color: '#a78bfa', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>

          {/* 지망생 프로필 카드 */}
          {t && (
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18, flexShrink: 0, overflow: 'hidden',
                  background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>{t.name[0]}</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#241C15', fontSize: 18 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#8A7F6E' }}>
                    {[getAge(t.birth_date) && `${getAge(t.birth_date)}세`, t.gender === 'male' ? '남' : t.gender === 'female' ? '여' : null, t.nationality].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {(t.height || t.weight) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  {t.height && <span style={{ fontSize: 13, background: 'rgba(255,111,60,0.1)', color: '#D84A1E', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>키 {t.height}cm</span>}
                  {t.weight && <span style={{ fontSize: 13, background: 'rgba(255,111,60,0.1)', color: '#D84A1E', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}>몸무게 {t.weight}kg</span>}
                </div>
              )}

              {t.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: t.bio ? 12 : 0 }}>
                  {t.skills.map(s => (
                    <span key={s} style={{ fontSize: 12, background: 'rgba(168,85,247,0.15)', color: '#a78bfa', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              )}

              {canContact ? (
                t.bio && <p style={{ fontSize: 14, color: '#8A7F6E', lineHeight: 1.6, background: 'rgba(36,28,21,0.05)', borderRadius: 12, padding: '12px 14px' }}>{t.bio}</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8A7F6E', background: 'rgba(36,28,21,0.05)', borderRadius: 12, padding: '12px 14px' }}>
                  <Lock size={14} strokeWidth={2} />
                  자기소개는 1차 합격 후에 볼 수 있어요
                </div>
              )}
            </div>
          )}

          {canContact ? (
            <button onClick={handleStartChat} disabled={starting}
              className="w-full py-4 rounded-2xl text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(255,111,60,0.3)', opacity: starting ? 0.7 : 1 }}>
              {starting ? '연결 중...' : '채팅하기'}
            </button>
          ) : (
            <div style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.09)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#8A7F6E' }}>
                <Lock size={16} strokeWidth={2} />
                1차 합격 후 대화할 수 있어요
              </div>
              <div style={{ fontSize: 12.5, color: '#b0a99b', marginTop: 6, lineHeight: 1.6 }}>
                관심을 표시해두면 이 지망생이 오디션에 지원할 때 알려드려요
              </div>
            </div>
          )}
        </div>
      </div>


      <AgencyNav />
    </>
  )
}
