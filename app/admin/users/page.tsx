'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/AdminNav'
import { ShieldCheck } from 'lucide-react'

type Profile = {
  id: string; name: string; role: string; email?: string
  is_active: boolean; created_at: string; skills: string[]
}

const roleLabel: Record<string, string> = { talent: '지망생', agency: '기획사', admin: '관리자' }
const roleColor: Record<string, string> = { talent: '#D84A1E', agency: '#16a34a', admin: '#dc2626' }

type Admin = { id: string; name: string; email: string }

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [meId, setMeId] = useState('')

  async function loadAdmins() {
    const res = await fetch('/api/admin/admins')
    if (!res.ok) return
    const d = await res.json()
    setAdmins(d.admins ?? [])
    setMeId(d.me ?? '')
  }
  useEffect(() => { loadAdmins() }, [])

  async function addAdmin() {
    const email = (prompt(`관리자로 추가할 이메일

계정이 없으면 새로 만들어집니다.
그분은 이 주소로 로그인하시면 됩니다.`) ?? '').trim()
    if (!email) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('이메일 형식이 아니에요: ' + email); return }
    const name = (prompt('이름 (선택)') ?? '').trim()

    const res = await fetch('/api/admin/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: name || undefined }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { alert('추가 실패: ' + (d.error ?? '알 수 없는 오류')); return }
    alert(`${email} 을 관리자로 추가했어요.

그분께는 이렇게 안내하시면 됩니다:
kpick.app 로그인 화면에서 이 이메일을 넣고
[비밀번호를 잊으셨나요?]를 누르면 인증 코드가 갑니다.`)
    loadAdmins()
  }

  async function removeAdmin(id: string, email: string) {
    if (!confirm(`${email} 의 관리자 권한을 해제할까요?
계정은 남고 권한만 내려갑니다.`)) return
    const res = await fetch('/api/admin/admins', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { alert('해제 실패: ' + (d.error ?? '알 수 없는 오류')); return }
    loadAdmins()
  }

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

  async function changeRole(id: string, newRole: string) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
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
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>회원 관리 <span style={{ fontSize: 14, color: '#8A7F6E', fontWeight: 500 }}>({filtered.length}명)</span></h1>
        </div>

        {/* 관리자는 지망생 프로필과 연락처를 전부 본다. 대상이 미성년자가 많아
            아무나 올려서는 안 되고, 그래서 관리자만 관리자를 만들 수 있다. */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 20, border: '1px solid #e0e0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ShieldCheck size={17} strokeWidth={2} color="#dc2626" />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>관리자 {admins.length}명</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 12 }}>
            관리자는 지망생 정보와 연락처를 모두 볼 수 있어요. 꼭 필요한 분만 추가해주세요.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {admins.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, background: '#faf9ff',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e1b4b' }}>{a.name || '이름 없음'}</div>
                  <div style={{ fontSize: 12, color: '#8A7F6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                </div>
                {a.id === meId ? (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8A7F6E', flexShrink: 0 }}>본인</span>
                ) : (
                  <button onClick={() => removeAdmin(a.id, a.email)} style={{
                    fontSize: 12, padding: '6px 10px', borderRadius: 9, flexShrink: 0,
                    border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)',
                    color: '#dc2626', fontWeight: 700, cursor: 'pointer',
                  }}>권한 해제</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addAdmin} style={{
            width: '100%', padding: '11px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: '#fff',
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          }}>
            관리자 추가
          </button>
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
          <div style={{ textAlign: 'center', padding: 48, color: '#8A7F6E' }}>불러오는 중...</div>
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
                  background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{u.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#8A7F6E' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')} 가입</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: `${roleColor[u.role]}15`, color: roleColor[u.role] }}>
                  {roleLabel[u.role]}
                </span>
                <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: `1px solid ${roleColor[u.role]}40`, background: `${roleColor[u.role]}10`, color: roleColor[u.role], fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                  <option value="talent">지망생</option>
                  <option value="agency">기획사</option>
                  <option value="admin">관리자</option>
                </select>
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
