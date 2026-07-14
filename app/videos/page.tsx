'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { Home, Compass, Plus, Bell, Megaphone } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

type Video = {
  id: string; title: string; thumbnail_url: string | null
  view_count: number; status: string; created_at: string; category: string
}

export default function VideosPage() {
  const { lang } = useLang()
  const tx = useT(lang)

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={24} strokeWidth={2.5} color="white" />, fab: true },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('videos').select('id, title, thumbnail_url, view_count, status, created_at, category')
        .eq('talent_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false })
      setVideos(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff' }}>{tx.videos.myVideos}</h1>
          <Link href="/videos/upload"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 12px rgba(6,182,212,0.3)' }}>
            + {tx.videos.uploadBtn}
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#555570' }}>{tx.common.loading}</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#111118', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 700, color: '#eeeeff', marginBottom: 6 }}>{tx.videos.noVideos}</div>
            <div style={{ fontSize: 13, color: '#555570', marginBottom: 20 }}>{tx.videos.firstVideo}</div>
            <Link href="/videos/upload"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
              {tx.videos.uploadVideo}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', aspectRatio: '1', display: 'block', position: 'relative', overflow: 'hidden', background: 'rgba(6,182,212,0.08)' }}>
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>
                }
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

