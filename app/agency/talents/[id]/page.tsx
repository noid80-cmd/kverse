'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import AgencyNav from '@/components/layout/AgencyNav'
import Link from 'next/link'
import { MessageCircle, Video, Heart, Bookmark, Lock, Play } from 'lucide-react'
import { checkContactAccess } from '@/lib/contactGate'
import AuditionOfferBox from '@/components/AuditionOfferBox'
import { sendPush } from '@/lib/notify'

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

type Talent = {
  id: string; name: string; avatar_url: string | null; bio: string | null
  birth_date: string | null; gender: string | null; height: number | null; weight: number | null; skills: string[]; nationality: string | null
}
type Video = { id: string; title: string; thumbnail_url: string | null; view_count: number; like_count: number; category: string }
// 기획사가 프로필에 오는 이유는 "이 사람 더 알아보려고"인데, 정작 우리
// 오디션에 뭘 내고 지원했는지가 여기 없었다. 지원자 목록에서만 보여서
// 프로필에 와도 볼 게 없었다.
type AppliedRow = {
  id: string; status: string; created_at: string; decided_at: string | null
  video_url: string; thumbnail_url: string | null
  auditionTitle: string
}

export default function TalentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [talent, setTalent] = useState<Talent | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [myId, setMyId] = useState('')
  const [convId, setConvId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  // 기본값은 잠금. 판정이 끝나기 전에 잠깐이라도 열려 보이면 안 된다.
  const [canContact, setCanContact] = useState(false)
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedRow[]>([])
  const [playingAppId, setPlayingAppId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'agency' && profile?.role !== 'admin') { router.replace('/dashboard'); return }

      setMyId(user.id)

      const [{ data: t }, { data: v }, { data: conv }, { data: bm }, { data: ag }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url, birth_date, gender, height, weight, skills, nationality').eq('id', id).single(),
        supabase.from('videos').select('id, title, thumbnail_url, view_count, like_count, category').eq('talent_id', id).eq('status', 'active').or('visibility.eq.public,visibility.eq.agency_only,visibility.is.null').order('created_at', { ascending: false }),
        supabase.from('conversations').select('id').eq('agency_member_id', user.id).eq('talent_id', id).eq('deleted_by_agency', false).single(),
        supabase.from('bookmarks').select('id').eq('agency_member_id', user.id).eq('talent_id', id).is('cancelled_at', null).limit(1).maybeSingle(),
        supabase.from('agency_members').select('agency_id, agencies(name)').eq('profile_id', user.id).single(),
      ])

      setTalent({ ...(t as unknown as Talent), bio: null })
      setVideos((v as unknown as Video[]) ?? [])
      if (conv) setConvId(conv.id)
      setBookmarked(!!bm)
      setAgencyName((ag?.agencies as unknown as { name: string } | null)?.name ?? '기획사')

      // 자기소개 전문은 사실상 외부 연락처다(인스타 아이디를 여기 적는다).
      // 그래서 아예 받아오지 않다가 자격이 확인된 뒤에만 따로 가져온다 —
      // 화면에서만 가리면 네트워크 탭에 그대로 남는다.
      const myAgency = (ag?.agency_id as string | undefined) ?? null
      setAgencyId(myAgency)

      if (myAgency) {
        const { data: mine } = await supabase.from('auditions').select('id, title').eq('agency_id', myAgency)
        const titleById = new Map((mine ?? []).map(a => [a.id as string, a.title as string]))
        if (titleById.size > 0) {
          const { data: apps } = await supabase.from('audition_applications')
            .select('id, audition_id, status, created_at, decided_at, video_url, thumbnail_url')
            .eq('talent_id', id).in('audition_id', [...titleById.keys()])
            .order('created_at', { ascending: false })
          setApplied((apps ?? []).map(a => ({
            id: a.id as string,
            status: a.status as string,
            created_at: a.created_at as string,
            decided_at: (a.decided_at as string | null) ?? null,
            video_url: a.video_url as string,
            thumbnail_url: (a.thumbnail_url as string | null) ?? null,
            auditionTitle: titleById.get(a.audition_id as string) ?? '오디션',
          })))
        }
      }
      const access = await checkContactAccess(supabase, {
        agencyMemberId: user.id,
        agencyId: myAgency,
        talentId: id,
      })
      setCanContact(access.allowed)
      if (access.allowed) {
        const { data: full } = await supabase.from('profiles').select('bio').eq('id', id).single()
        if (full?.bio) setTalent(prev => (prev ? { ...prev, bio: full.bio as string } : prev))
      }
    }
    load()
  }, [id])

  async function toggleBookmark() {
    if (bookmarked) {
      // 지우지 않고 표시만 한다 — 지망생 쪽 기록은 남는다.
      await supabase.from('bookmarks').update({ cancelled_at: new Date().toISOString() })
        .eq('agency_member_id', myId).eq('talent_id', id).is('cancelled_at', null)
      setBookmarked(false)
    } else {
      await supabase.from('bookmarks').insert({ agency_member_id: myId, talent_id: id })
      setBookmarked(true)
      sendPush({ userId: id, title: '관심 기획사 +1', body: `${agencyName}이(가) 관심 지망생으로 등록했어요`, url: '/reactions?tab=bookmarks' })
    }
  }

  async function handleChat() {
    if (convId) { router.push(`/chat/${convId}`); return }
    if (!canContact) return
    setStarting(true)
    const { data } = await supabase.from('conversations').insert({ agency_member_id: myId, talent_id: id }).select('id').single()
    if (data) {
      const { data: ag } = await supabase.from('agency_members').select('agencies(name)').eq('profile_id', myId).single()
      const agName = (ag?.agencies as unknown as { name: string } | null)?.name ?? '기획사'
      sendPush({ userId: id, title: '채팅 요청', body: `${agName}에서 채팅을 시작했어요`, url: '/reactions' })
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f8', color: '#8A7F6E' }}>
      불러오는 중...
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8A7F6E', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b' }}>프로필</span>
        </div>

        {/* 프로필 카드 */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #e8e8f2', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {talent.avatar_url
                ? <img src={talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 26 }}>{talent.name[0]}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 22 }}>{talent.name}</span>
                <button onClick={toggleBookmark} style={{
                  width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: bookmarked ? 'rgba(251,191,36,0.15)' : '#f0f0f8',
                  color: bookmarked ? '#d97706' : '#b0b0cc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bookmark size={15} strokeWidth={2} fill={bookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div style={{ fontSize: 14, color: '#8A7F6E' }}>
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
              {talent.height && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#D84A1E', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>키 {talent.height}cm</span>}
              {talent.weight && <span style={{ fontSize: 13, background: '#f0f0f8', color: '#D84A1E', padding: '7px 14px', borderRadius: 12, fontWeight: 700 }}>몸무게 {talent.weight}kg</span>}
            </div>
          )}

          {talent.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: talent.bio ? 16 : 0 }}>
              {talent.skills.map(s => (
                <span key={s} style={{ fontSize: 13, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#7c3aed', padding: '5px 12px', borderRadius: 20, fontWeight: 700 }}>{s}</span>
              ))}
            </div>
          )}

          {canContact ? (
            talent.bio && (
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, background: '#f8f7ff', borderRadius: 14, padding: '14px 16px', margin: 0 }}>{talent.bio}</p>
            )
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#8A7F6E', background: '#f8f7ff',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <Lock size={14} strokeWidth={2} />
              자기소개는 1차 합격 후에 볼 수 있어요
            </div>
          )}
        </div>

        {/* 채팅 버튼 — 1차 합격 전에는 열리지 않는다 */}
        {canContact ? (
          <button onClick={handleChat} disabled={starting}
            style={{
              width: '100%', padding: '16px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white',
              fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(255,111,60,0.3)',
              marginBottom: 24, opacity: starting ? 0.7 : 1,
            }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <MessageCircle size={18} strokeWidth={2} />
              {starting ? '연결 중...' : convId ? '채팅 이어가기' : '채팅하기'}
            </span>
          </button>
        ) : (
          <AuditionOfferBox
            agencyMemberId={myId} agencyId={agencyId}
            talentId={id} talentName={talent.name}
            agencyName={agencyName} tone="cool" />
        )}

        {applied.length > 0 && (
          <>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', marginBottom: 14 }}>우리 오디션 지원 이력</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {applied.map(a => {
                const label = a.status === 'invited' ? { t: '1차 합격', c: '#16a34a', bg: '#dcfce7' }
                  : a.status === 'rejected' ? { t: '심사 종료', c: '#94a3b8', bg: '#f0f0f8' }
                  : a.status === 'skip' ? { t: '패스', c: '#94a3b8', bg: '#f0f0f8' }
                  : { t: '검토중', c: '#ca8a04', bg: '#fef9c3' }
                return (
                  <div key={a.id} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid #e8e8f2' }}>
                    {playingAppId === a.id ? (
                      <video src={a.video_url} controls autoPlay playsInline poster={a.thumbnail_url ?? undefined}
                        style={{ width: '100%', maxHeight: 280, display: 'block', background: '#000' }} />
                    ) : (
                      <div onClick={() => setPlayingAppId(a.id)} style={{ cursor: 'pointer', position: 'relative', height: 150, background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {a.thumbnail_url
                          ? <img src={a.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Video size={30} strokeWidth={1.5} color="#a5b4fc" />}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(36,28,21,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={18} strokeWidth={2} color="#fff" fill="#fff" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.auditionTitle}</div>
                        <div style={{ fontSize: 12, color: '#8A7F6E', marginTop: 2 }}>
                          지원 {new Date(a.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <span style={{ background: label.bg, color: label.c, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>{label.t}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

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
                      <span style={{ fontSize: 12, color: '#b0b0cc', display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={11} strokeWidth={2} color="#DC2626" fill="#DC2626" /> {v.like_count}</span>
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
