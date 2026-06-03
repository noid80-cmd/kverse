'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

const categoryLabel: Record<string, string> = {
  vocal: '보컬', dance: '댄스', acting: '연기', rap: '랩', other: '기타'
}
const categoryEmoji: Record<string, string> = {
  vocal: '🎤', dance: '💃', acting: '🎭', rap: '🎙️', other: '✨'
}

type Video = {
  id: string; title: string; thumbnail_url: string | null
  view_count: number; like_count: number; category: string; tags: string[]; created_at: string
  talent: { id: string; name: string; avatar_url: string | null } | null
}

export default function ExplorePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'latest' | 'likes'>('latest')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [myId, setMyId] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const user = (await supabase.auth.getSession()).data.session?.user
    if (!user) { window.location.href = '/login'; return }
    setMyId(user.id)

    let q = supabase.from('videos').select(`
      id, title, thumbnail_url, view_count, like_count, category, tags, created_at,
      talent:profiles!talent_id(id, name, avatar_url)
    `).eq('status', 'active').limit(60)

    if (category !== 'all') q = q.eq('category', category)
    q = sort === 'likes'
      ? q.order('like_count', { ascending: false })
      : q.order('created_at', { ascending: false })

    const { data } = await q
    const vids = (data as unknown as Video[]) ?? []
    setVideos(vids)

    const counts: Record<string, number> = {}
    vids.forEach(v => { counts[v.id] = v.like_count })
    setLikeCounts(counts)

    const { data: myLikes } = await supabase.from('likes').select('video_id').eq('user_id', user.id)
    setLiked(new Set(myLikes?.map(l => l.video_id).filter(Boolean) as string[]))

    setLoading(false)
  }, [category, sort])

  useEffect(() => { load() }, [load])

  async function toggleLike(e: React.MouseEvent, videoId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!myId) return
    if (liked.has(videoId)) {
      await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', myId)
      setLiked(prev => { const s = new Set(prev); s.delete(videoId); return s })
      setLikeCounts(prev => ({ ...prev, [videoId]: Math.max((prev[videoId] ?? 1) - 1, 0) }))
    } else {
      await supabase.from('likes').insert({ video_id: videoId, user_id: myId })
      setLiked(prev => new Set([...prev, videoId]))
      setLikeCounts(prev => ({ ...prev, [videoId]: (prev[videoId] ?? 0) + 1 }))
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>탐색</h1>
            <p style={{ fontSize: 13, color: '#8b8baa' }}>다른 지망생들의 영상을 구경해보세요</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['latest', 'likes'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{
                  padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: sort === s ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
                  color: sort === s ? 'white' : '#8b8baa',
                  boxShadow: sort === s ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}>
                {s === 'latest' ? '최신순' : '❤️ 인기순'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {(['all', 'vocal', 'dance', 'acting', 'rap', 'other'] as const).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, transition: 'all 0.15s', border: 'none', cursor: 'pointer',
                background: category === c ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
                color: category === c ? 'white' : '#8b8baa',
                boxShadow: category === c ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                outline: category === c ? 'none' : '1px solid #e0e0f0',
              }}>
              {c === 'all' ? '전체' : `${categoryEmoji[c]} ${categoryLabel[c]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', border: '2px dashed #d8d8ec' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
            <div style={{ fontWeight: 700, color: '#1e1b4b' }}>아직 영상이 없어요</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {videos.map(v => (
              <Link key={v.id} href={`/videos/${v.id}`} style={{ textDecoration: 'none', aspectRatio: '1', display: 'block', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)' }}>
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>
                }
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '20px 6px 6px' }}>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.talent?.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.title}</div>
                </div>
                <button onClick={e => toggleLike(e, v.id)}
                  style={{
                    position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.45)',
                    border: 'none', borderRadius: 10, padding: '3px 7px', outline: 'none',
                    display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 11 }}>{liked.has(v.id) ? '❤️' : '🤍'}</span>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>{likeCounts[v.id] ?? 0}</span>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}
