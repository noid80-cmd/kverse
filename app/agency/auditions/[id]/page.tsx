'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgencyNav from '@/components/layout/AgencyNav'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video, CheckCircle, XCircle, Send } from 'lucide-react'
import { sendPush } from '@/lib/notify'

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
  const [agencyName, setAgencyName] = useState('')
  // 1차 합격은 메시지를 보내야 완료된다. 눌러만 놓고 아무 말도 안 하면
  // 지망생은 기대만 부풀다 방치되는데, 그건 아예 안 뽑힌 것보다 나쁘다.
  const [passTarget, setPassTarget] = useState<{ appId: string; talentId: string; name: string } | null>(null)
  const [passMessage, setPassMessage] = useState('')
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

      const { data: am } = await supabase.from('agency_members').select('agency_id').eq('profile_id', user.id).maybeSingle()
      if (am?.agency_id) {
        const { data: ag } = await supabase.from('agencies').select('name').eq('id', am.agency_id).maybeSingle()
        setAgencyName(ag?.name ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(appId: string, status: 'skip' | 'pending') {
    setUpdating(appId)
    await supabase.from('audition_applications').update({ status }).eq('id', appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    setUpdating(null)
  }

  function openPass(appId: string, talentId: string, name: string) {
    if (!talentId) return
    setPassTarget({ appId, talentId, name })
    // 기본 문구를 채워두면 마찰이 거의 없다. 고쳐 쓰는 건 자유.
    setPassMessage(
      `안녕하세요 ${name}님! ${agencyName || '저희 기획사'}입니다.
` +
      `"${audition?.title ?? '오디션'}"에 지원해 주신 영상 인상 깊게 봤습니다 😊
` +
      `다음 단계 안내드리고 싶은데, 편하게 말씀 나눠요!`
    )
  }

  async function confirmPass() {
    if (!passTarget) return
    const body = passMessage.trim()
    if (!body) return
    const { appId, talentId } = passTarget
    setUpdating(appId)

    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { setUpdating(null); return }

    const { data: existing } = await supabase.from('conversations').select('id')
      .eq('agency_member_id', user.id).eq('talent_id', talentId).limit(1).maybeSingle()

    let convId: string | undefined = existing?.id
    if (!convId) {
      const { data: newConv } = await supabase.from('conversations')
        .insert({ agency_member_id: user.id, talent_id: talentId })
        .select('id').single()
      convId = newConv?.id
    }
    if (!convId) {
      alert('대화를 열 수 없었어요. 잠시 후 다시 시도해주세요.')
      setUpdating(null)
      return
    }

    await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, content: body })

    // 메시지가 실제로 나간 뒤에 합격 처리한다. 순서가 바뀌면 메시지 전송이
    // 실패했을 때 "합격했는데 아무 말 없음" 상태가 그대로 남는다.
    await supabase.from('audition_applications').update({ status: 'invited' }).eq('id', appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'invited' } : a))

    sendPush({
      userId: talentId,
      title: '1차 합격 🎉',
      body: `${agencyName || '기획사'}에서 메시지가 왔어요. 확인해보세요.`,
      url: `/chat/${convId}`,
    })

    setPassTarget(null)
    setPassMessage('')
    setUpdating(null)
  }

  function getAge(birth: string | null) {
    if (!birth) return null
    return new Date().getFullYear() - new Date(birth).getFullYear()
  }

  const statusBadge = (s: string) => {
    if (s === 'invited') return { bg: '#dcfce7', color: '#16a34a', label: '1차 합격' }
    if (s === 'skip') return { bg: '#f0f0f8', color: '#94a3b8', label: '패스' }
    return { bg: '#fef9c3', color: '#ca8a04', label: '검토중' }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8A7F6E', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 2 }}>
              {audition ? audition.category.split(',').map(c => categoryLabel[c] ?? c).join(' · ') : ''}
              {audition?.deadline ? ` · ~${audition.deadline}` : ''}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1e1b4b' }}>{audition?.title ?? '...'}</h1>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 16, fontWeight: 600 }}>
          지원자 {apps.length}명
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
        ) : apps.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>아직 지원자가 없어요</div>
            <div style={{ fontSize: 13, color: '#8A7F6E' }}>공고를 지망생들과 공유해보세요</div>
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
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(36,28,21,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>▶</div>
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
                        background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {a.talent?.avatar_url
                          ? <img src={a.talent.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontWeight: 900, fontSize: 13 }}>{a.talent?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{a.talent?.name ?? '이름 없음'}</div>
                        {age && <div style={{ fontSize: 12, color: '#8A7F6E' }}>{age}세</div>}
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
                        <button onClick={() => updateStatus(a.id, 'skip')}
                          disabled={updating === a.id}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: '#f0f0f8', color: '#94a3b8', border: 'none', borderRadius: 12,
                            padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>
                          <XCircle size={15} strokeWidth={2} /> 패스
                        </button>
                        <button onClick={() => openPass(a.id, a.talent?.id ?? '', a.talent?.name ?? '')}
                          disabled={updating === a.id}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', border: 'none', borderRadius: 12,
                            padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}>
                          <CheckCircle size={15} strokeWidth={2} /> 1차 합격
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateStatus(a.id, 'pending')}
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
      {passTarget && (
        <div
          onClick={() => { if (!updating) { setPassTarget(null); setPassMessage('') } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(36,28,21,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, background: '#FFFFFF',
            borderRadius: '24px 24px 0 0', padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 6 }}>
              {passTarget.name}님을 1차 합격시킵니다
            </div>
            <div style={{ fontSize: 13, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 16 }}>
              보내는 메시지가 지망생에게 바로 알림으로 갑니다. 합격만 눌러두고
              연락이 없으면 기다리게 되기 때문에, 첫 마디까지 함께 보냅니다.
            </div>

            <textarea
              value={passMessage}
              onChange={e => setPassMessage(e.target.value)}
              rows={6}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 16, resize: 'none',
                border: '1px solid rgba(36,28,21,0.14)', background: '#FFFDF7',
                fontSize: 14, lineHeight: 1.7, color: '#241C15', fontFamily: 'inherit',
                outline: 'none', marginBottom: 16,
              }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setPassTarget(null); setPassMessage('') }}
                disabled={!!updating}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(36,28,21,0.05)', color: '#8A7F6E',
                  border: 'none', fontSize: 15, fontWeight: 700,
                }}>
                취소
              </button>
              <button
                onClick={confirmPass}
                disabled={!!updating || !passMessage.trim()}
                style={{
                  flex: 2, padding: '14px', borderRadius: 14,
                  cursor: passMessage.trim() ? 'pointer' : 'not-allowed',
                  background: passMessage.trim()
                    ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)'
                    : 'rgba(36,28,21,0.12)',
                  color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Send size={16} strokeWidth={2} />
                {updating ? '보내는 중...' : '합격 알리고 대화 시작'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AgencyNav />
    </div>
  )
}
