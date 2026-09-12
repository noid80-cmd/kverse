'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import { useTalentNav } from '@/components/layout/talentNav'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

type Video = {
  id: string; title: string; thumbnail_url: string | null
  view_count: number; status: string; created_at: string; category: string
  visibility: string | null
}

export default function VideosPage() {
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = useTalentNav()

  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('videos').select('id, title, thumbnail_url, view_count, status, created_at, category, visibility')
        .eq('talent_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false })
      setVideos(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FFF8E7' }}>
      <div className="max-w-lg mx-auto px-4 kv-safe-top">

        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15' }}>{tx.videos.myVideos}</h1>
          <Link href="/videos/upload"
            style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 12px rgba(255,111,60,0.3)' }}>
            + {tx.videos.uploadBtn}
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>{tx.common.loading}</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed rgba(36,28,21,0.1)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 700, color: '#241C15', marginBottom: 6 }}>{tx.videos.noVideos}</div>
            <div style={{ fontSize: 13, color: '#8A7F6E', marginBottom: 20 }}>{tx.videos.firstVideo}</div>
            <Link href="/videos/upload"
              style={{ background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
              {tx.videos.uploadVideo}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', aspectRatio: '1', display: 'block', position: 'relative', overflow: 'hidden', background: 'rgba(255,111,60,0.08)' }}>
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>
                }
                {/* 기획사에게 보이는지 아닌지. 칸이 좁아 글자는 안 들어가므로
                    켜진 점과 자물쇠로 가른다 — 목록을 훑으면 한눈에 세어진다. */}
                <div
                  title={v.visibility === 'private' ? tx.videos.hiddenBadge : tx.videos.exposedBadge}
                  style={{
                    position: 'absolute', top: 5, left: 5, width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {v.visibility === 'private'
                    ? <Lock size={11} strokeWidth={2.2} color="rgba(255,255,255,0.85)" />
                    : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6F3C' }} />}
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '16px 6px 6px' }}>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.title}</div>
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

