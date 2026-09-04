'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Send, Clock } from 'lucide-react'
import { sendPush } from '@/lib/notify'

// 1차 합격 전에 채팅 자리에 들어가는 상자.
//
// 그냥 "잠겼습니다"만 띄우면 기획사는 좋은 사람을 발견하고도 할 게 없어서
// 인스타로 간다. 다음 공고를 기다리라고 할 수도 없다 — 언제 열릴지 모르고,
// 그 사이에 기획사는 식는다. 그래서 여기에 상시 경로인 오디션 제안을 둔다.
//
// "캐스팅 제안"이 아니라 "오디션 제안"인 이유: 캐스팅은 뽑았다는 뉘앙스라
// 기획사가 부담스러워하고, 실제로 아직 뽑은 것도 아니다. 오디션 제안은
// 약속이 아니라 기회라서 나중에 안 돼도 지망생이 덜 상처받는다.

type Offer = { id: string; status: string; created_at: string; expires_at: string }

export default function AuditionOfferBox({
  agencyMemberId, agencyId, talentId, talentName, videoId, agencyName, tone = 'light',
}: {
  agencyMemberId: string
  agencyId: string | null
  talentId: string
  talentName: string
  videoId?: string | null
  agencyName?: string
  /** 크림 배경(discover) 과 회색 배경(talents) 이 달라서 테두리 톤만 맞춘다 */
  tone?: 'light' | 'cool'
}) {
  const supabase = createClient()
  const [offer, setOffer] = useState<Offer | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const border = tone === 'cool' ? '1px solid #e8e8f2' : '1px solid rgba(36,28,21,0.09)'
  const sub = tone === 'cool' ? '#b0b0cc' : '#b0a99b'

  useEffect(() => {
    if (!agencyMemberId || !talentId) return
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('audition_offers').select('id, status, created_at, expires_at')
        .eq('agency_member_id', agencyMemberId).eq('talent_id', talentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()
      if (alive) setOffer((data as Offer) ?? null)
    })()
    return () => { alive = false }
  }, [agencyMemberId, talentId])

  function openModal() {
    setMessage(
      `안녕하세요 ${talentName}님! ${agencyName || '저희 기획사'}입니다.\n` +
      `올려주신 영상을 인상 깊게 봤습니다 😊\n` +
      `저희 오디션에 한번 참여해보시겠어요?`
    )
    setOpen(true)
  }

  async function send() {
    const body = message.trim()
    if (!body || !agencyId) return
    setSending(true)
    const { data, error } = await supabase.from('audition_offers').insert({
      agency_id: agencyId,
      agency_member_id: agencyMemberId,
      talent_id: talentId,
      video_id: videoId ?? null,
      message: body,
    }).select('id, status, created_at, expires_at').single()
    setSending(false)

    if (error || !data) {
      alert('제안을 보내지 못했어요. 잠시 후 다시 시도해주세요.')
      return
    }
    setOffer(data as Offer)
    setOpen(false)
    sendPush({
      userId: talentId,
      title: '오디션 제안이 왔어요 🎬',
      body: `${agencyName || '기획사'}에서 오디션 제안을 보냈어요.`,
      url: '/reactions?tab=offers',
    })
  }

  if (offer) {
    const until = new Date(offer.expires_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return (
      <div style={{ width: '100%', padding: '16px', borderRadius: 18, marginBottom: 24, background: '#FFFFFF', border, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#D84A1E' }}>
          <Clock size={16} strokeWidth={2} />
          오디션 제안을 보냈어요
        </div>
        <div style={{ fontSize: 12.5, color: sub, marginTop: 6, lineHeight: 1.6 }}>
          {talentName}님이 수락하면 대화가 열립니다 · {until}까지
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ width: '100%', padding: '16px', borderRadius: 18, marginBottom: 24, background: '#FFFFFF', border, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#8A7F6E' }}>
          <Lock size={16} strokeWidth={2} />
          1차 합격 후 대화할 수 있어요
        </div>
        <div style={{ fontSize: 12.5, color: sub, marginTop: 6, marginBottom: 14, lineHeight: 1.6 }}>
          오디션 지원자를 1차 합격시키면 채팅과 연락처가 열립니다
        </div>
        <button onClick={openModal} disabled={!agencyId}
          style={{
            width: '100%', padding: '13px', borderRadius: 14, border: 'none',
            cursor: agencyId ? 'pointer' : 'not-allowed',
            background: agencyId ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : 'rgba(36,28,21,0.12)',
            color: '#FFFFFF', fontSize: 15, fontWeight: 700,
          }}>
          지금 오디션 제안하기
        </button>
      </div>

      {open && (
        <div onClick={() => { if (!sending) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(36,28,21,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, background: '#FFFFFF',
            borderRadius: '24px 24px 0 0', padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 6 }}>
              {talentName}님에게 오디션 제안
            </div>
            <div style={{ fontSize: 13, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 16 }}>
              지망생이 수락하면 이 메시지가 첫 대화로 전달되고 연락처가 열립니다.
              14일 안에 응답이 없으면 자동으로 만료돼요.
            </div>

            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 16, resize: 'none',
                border: '1px solid rgba(36,28,21,0.14)', background: '#FFFDF7',
                fontSize: 14, lineHeight: 1.7, color: '#241C15', fontFamily: 'inherit',
                outline: 'none', marginBottom: 16,
              }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setOpen(false)} disabled={sending}
                style={{ flex: 1, padding: '14px', borderRadius: 14, cursor: 'pointer', background: 'rgba(36,28,21,0.05)', color: '#8A7F6E', border: 'none', fontSize: 15, fontWeight: 700 }}>
                취소
              </button>
              <button onClick={send} disabled={sending || !message.trim()}
                style={{
                  flex: 2, padding: '14px', borderRadius: 14,
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  background: message.trim() ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : 'rgba(36,28,21,0.12)',
                  color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Send size={16} strokeWidth={2} />
                {sending ? '보내는 중...' : '제안 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
