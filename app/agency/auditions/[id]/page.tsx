'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video, CheckCircle, XCircle } from 'lucide-react'

type Application = {
  id: string
  message: string | null
  video_url: string
  thumbnail_url: string | null
  status: string
  created_at: string
  talent: { id: string; name: string; avatar_url: string | null; birth_date: string | null; skills: string[] } | null
}

type Audition = { id: string; title: string; category: string; deadline: string | null }

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}

export default function AuditionApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const [audition, setAudition] = useState<Audition | null>(null)
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { id } = await params
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }

      const { data: aud } = await supabase.from('auditions')
        .select('id, title, category, deadline').eq('id', id).single()
      setAudition(aud)

      const { data } = await supabase.from('audition_applications')
        .select('id, message, video_url, thumbnail_url, status, created_at, talent:profiles!talent_id(id, name, avatar_url, birth_date, skills)')
        .eq('audition_id', id)
        .order('created_at', { ascending: false })

      setApps((data as unknown as Application[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(appId: string, status: 'invited' | 'skip' | 'pending', talentId: string) {
    setUpdating(appId)
    await supabase.from('audition_applications').update({ status }).eq('id', appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))

    if (status === 'invited') {
      if (!talentId) { setUpdating(null); return }
      const user = (await supabase.auth.getSession()).data.session?.user
      if (user) {
        const { data: existing } = await supabase.from('conversations').select('id')
          .eq('agency_member_id', user.id).eq('talent_id', talentId).single()

        let convId = existing?.id
        if (!existing) {
          const { data: newConv } = await supabase.from('conversations')
            .insert({ agency_member_id: user.id, talent_id: talentId })
            .select('id').single()
          convId = newConv?.id

          if (convId) {
            const { data: agMember } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).single()
            const agencyDisplayName = agMember?.agency_id
              ? (await supabase.from('agencies').select('name').eq('id', agMember.agency_id).single()).data?.name
              : null
            const greeting = `안녕하세요! 저희 ${agencyDisplayName ?? '기획사'}에서 "${audition?.title ?? '오디션'}"에 지원해 주신 영상을 인상 깊게 봤습니다 😊 편하게 말씀 나눠요!`
            await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, content: greeting })
          }
        }
      }
      supabase.auth.getSession().then(({ data: s }) => {
        const token = s.session?.access_token
        fetch('/api/push', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            userId: talentId,
            title: '오디션 초대 🎉',
            body: `${audition?.title ?? '오디션'} 오디션 콜이 왔어요! 채팅을 확인해보세요.`,
            url: '/dashboard/auditions',
          }),
        })
      })
    }
    setUpdating(null)
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    return new Date().getFullYear() - new Date(birth).getFullYear()
  }

  const statusBadge = (s: string) => {
    if (s === 'invited') return { bg: '#dcfce7', color: '#16a34a', label: '초대' }
    if (s === 'skip') return { bg: '#f0f0f8', color: '#94a3b8', label: '패스' }
    return { bg: '#fef9c3', color: '#ca8a04', label: '검토중' }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8b8baa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 13, color: '#8b8baa', marginBottom: 2 }}>
              {audition ? audition.category.split(',').map(c => categoryLabel[c] ?? c).join(' · ') : ''}
              {audition?.deadline ? ` · ~${audition.deadline}` : ''}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1e1b4b' }}>{audition?.title ?? '...'}</h1>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#8b8baa', marginBottom: 16, fontWeight: 600 }}>
          지원자 {apps.length}명
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : apps.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 지원자가 없어요</div>
            <div style={{ fontSize: 13, color: '#8b8baa' }}>공고를 지망생들과 공유해보세요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {apps.map(a => {
              const badge = statusBadge(a.status)
              const age = getAge(a.talent?.birth_date ?? null)
              return (
                <div key={a.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e8e8f2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {/* 영상 플레이어 */}
                  {playingId === a.id ? (
                    <video
                      src={a.video_url} controls autoPlay playsInline
                      poster={a.thumbnail_url ?? undefined}
                      style={{ width: '100%', maxHeight: 280, display: 'block', background: '#000' }}
                    />
                  ) : (
                    <div onClick={() => setPlayingId(a.id)} style={{ cursor: 'pointer' }}>
                      <div style={{
                        height: 160, background: a.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
                      }}>
                        {a.thumbnail_url
                          ? <img src={a.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Video size={36} strokeWidth={1.5} color="#a5b4fc" />
                        }
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>▶</div>
                        </div>
                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{badge.label}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '14px 16px' }}>
                    {/* 지망생 정보 */}
                    <Link href={`/agency/talents/${a.talent?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {a.talent?.avatar_url
                          ? <img src={a.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontWeight: 900, fontSize: 13 }}>{a.talent?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{a.talent?.name ?? '이름 없음'}</div>
                        {age && <div style={{ fontSize: 12, color: '#8b8baa' }}>{age}세</div>}
                      </div>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Link>

                    {a.message && (
                      <div style={{ fontSize: 13, color: '#6b7280', background: '#f8f8fc', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                        {a.message}
                      </div>
                    )}

                    {a.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => updateStatus(a.id, 'skip', a.talent?.id ?? '')}
                          disabled={updating === a.id}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: '#f0f0f8', color: '#94a3b8', border: 'none', borderRadius: 12,
                            padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>
                          <XCircle size={15} strokeWidth={2} /> 패스
                        </button>
                        <button onClick={() => updateStatus(a.id, 'invited', a.talent?.id ?? '')}
                          disabled={updating === a.id}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', borderRadius: 12,
                            padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>
                          <CheckCircle size={15} strokeWidth={2} /> 초대
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateStatus(a.id, 'pending', a.talent?.id ?? '')}
                        disabled={updating === a.id}
                        style={{
                          width: '100%', background: 'none', border: '1px solid #e0e0f0',
                          borderRadius: 12, padding: '8px', fontSize: 12, fontWeight: 600,
                          color: '#94a3b8', cursor: 'pointer',
                        }}>
                        되돌리기
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <AgencyNav />
    </div>
  )
}
