'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/explore', label: '탐색', icon: '🔍' },
  { href: '/videos/upload', label: '올리기', icon: '➕' },
  { href: '/reactions', label: '반응', icon: '⭐' },
  { href: '/profile/edit', label: '프로필', icon: '👤' },
]

const inputStyle = {
  width: '100%', background: '#fff', border: '1px solid #e0e0f0',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#1e1b4b',
}

const skillOptions = ['보컬', '댄스', '랩', '연기', '작사', '작곡', '악기', '퍼포먼스']

export default function ProfileEditPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [userId, setUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setName(data.name ?? '')
        setBio(data.bio ?? '')
        setBirthDate(data.birth_date ?? '')
        setGender(data.gender ?? '')
        setHeight(data.height?.toString() ?? '')
        setWeight(data.weight?.toString() ?? '')
        setPhone(data.phone ?? '')
        setNationality(data.nationality ?? '')
        setSkills(data.skills ?? [])
        setAvatarUrl(data.avatar_url ?? null)
      }
    }
    load()
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setAvatarUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(publicUrl + '?t=' + Date.now())
    setAvatarUploading(false)
  }

  function toggleSkill(s: string) {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      bio: bio.trim() || null,
      birth_date: birthDate || null,
      gender: gender || null,
      height: height ? parseInt(height) : null,
      weight: weight ? parseInt(weight) : null,
      phone: phone.trim() || null,
      nationality: nationality.trim() || null,
      skills,
    }).eq('id', user.id)

    setSaving(false)
    if (error) {
      setSaveError('저장 실패: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b', marginBottom: 24 }}>내 프로필</h1>

        {/* 프로필 사진 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28, overflow: 'hidden',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid #fff', boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 32 }}>{name?.[0] ?? '?'}</span>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: '#6366f1', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>📷</div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: 12, color: '#8b8baa', marginTop: 8 }}>
            {avatarUploading ? '업로드 중...' : '사진 변경'}
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b8baa', marginBottom: 12, letterSpacing: 0.5 }}>기본 정보</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="이름 *" required style={inputStyle} />
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                style={inputStyle} />
              <select value={gender} onChange={e => setGender(e.target.value)} style={inputStyle}>
                <option value="">성별 선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="연락처" style={inputStyle} />
              <input type="text" value={nationality} onChange={e => setNationality(e.target.value)}
                placeholder="국적 (예: 대한민국)" style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b8baa', marginBottom: 12 }}>신체 정보</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                placeholder="키 (cm)" style={inputStyle} />
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="몸무게 (kg)" style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b8baa', marginBottom: 12 }}>특기</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skillOptions.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', transition: 'all 0.15s',
                    background: skills.includes(s) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f0f0f8',
                    color: skills.includes(s) ? 'white' : '#8b8baa',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e8e8f2' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b8baa', marginBottom: 12 }}>자기소개</p>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="기획사 담당자에게 나를 소개해보세요" rows={4}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {saveError && <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{saveError}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-4 rounded-2xl text-white disabled:opacity-50 transition active:scale-95"
            style={{ background: saved ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </button>

          <button type="button" onClick={handleLogout}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid #e0e0f0', color: '#8b8baa', fontWeight: 700, fontSize: 15 }}>
            로그아웃
          </button>
        </form>
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}
