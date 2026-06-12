'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'

type Profile = {
  id: string; name: string; role: string; email?: string
  is_active: boolean; created_at: string; skills: string[]
}

const roleLabel: Record<string, string> = { talent: '지망생', agency: '기획사', admin: '관리자' }
const roleColor: Record<string, string> = { talent: '#0891b2', agency: '#16a34a', admin: '#dc2626' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

      const { data } = await supabase.from('profiles').select('id, name, role, is_active, created_at, skills').order('created_at', { ascending: false })
      setUsers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !current } : u))
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="min-h-screen" style={{ background: '#f0f0f8' }}>
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>회원 관리 <span style={{ fontSize: 14, color: '#8b8baa', fontWeight: 500 }}>({filtered.length}명)</span></h1>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름 검색"
            style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #e0e0f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1e1b4b' }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ background: '#fff', border: '1px solid #e0e0f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#1e1b4b' }}>
            <option value="all">전체</option>
            <option value="talent">지망생</option>
            <option value="agency">기획사</option>
            <option value="admin">관리자</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8b8baa' }}>불러오는 중...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(u => (
              <div key={u.id} style={{
                background: '#fff', borderRadius: 16, padding: '14px 18px',
                border: '1px solid #e8e8f2', display: 'flex', alignItems: 'center', gap: 14,
                opacity: u.is_active ? 1 : 0.5,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{u.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#8b8baa' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')} 가입</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: `${roleColor[u.role]}15`, color: roleColor[u.role] }}>
                  {roleLabel[u.role]}
                </span>
                <button onClick={() => toggleActive(u.id, u.is_active)}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 10, border: '1px solid #e0e0f0', background: 'none', color: u.is_active ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                  {u.is_active ? '비활성화' : '활성화'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
