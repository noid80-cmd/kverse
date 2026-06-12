'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { Home, Compass, Plus, Bell, Megaphone } from 'lucide-react'

const talentNav = [
  { href: '/dashboard', label: '홈', icon: <Home size={22} strokeWidth={1.8} /> },
  { href: '/explore', label: '탐색', icon: <Compass size={22} strokeWidth={1.8} /> },
  { href: '/dashboard/auditions', label: '오디션', icon: <Megaphone size={22} strokeWidth={1.8} /> },
  { href: '/videos/upload', label: '올리기', icon: <Plus size={22} strokeWidth={1.8} /> },
  { href: '/reactions', label: '반응', icon: <Bell size={22} strokeWidth={1.8} /> },
]

const inputStyle = {
  width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
}

const skillOptions = ['보컬', '댄스', '랩', '연기', '작사', '작곡', '악기', '퍼포먼스']

export default function ProfileEditPage() {
  const router = useRouter()
  type ProfileForm = { name: string; bio: string; birthDate: string; gender: string; height: string; weight: string; nationality: string; skills: string[]; avatarUrl: string | null; userId: string }
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setForm({
        userId: user.id,
        name: data?.name ?? '',
        bio: data?.bio ?? '',
        birthDate: data?.birth_date ?? '',
        gender: data?.gender ?? '',
        height: data?.height?.toString() ?? '',
        weight: data?.weight?.toString() ?? '',
        nationality: data?.nationality ?? '',
        skills: data?.skills ?? [],
        avatarUrl: data?.avatar_url ?? null,
      })
    }
    load()
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !form?.userId) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${form.userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setAvatarUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', form.userId)
    setForm(f => f ? { ...f, avatarUrl: publicUrl + '?t=' + Date.now() } : f)
    setAvatarUploading(false)
  }

  function updateForm(updater: (f: ProfileForm) => ProfileForm) {
    setSaved(false)
    setForm(f => f ? updater(f) : f)
  }

  function toggleSkill(s: string) {
    updateForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('profiles').update({
      name: form.name.trim(),
      bio: form.bio.trim() || null,
      birth_date: form.birthDate || null,
      gender: form.gender || null,
      height: form.height ? parseInt(form.height) : null,
      weight: form.weight ? parseInt(form.weight) : null,
      nationality: form.nationality.trim() || null,
      skills: form.skills,
    }).eq('id', form.userId)
    setSaving(false)
    if (error) { setSaveError('저장 실패: ' + error.message) }
    else { setSaved(true) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!form) return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #0891b2', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  const { name, bio, birthDate, gender, height, weight, nationality, skills, avatarUrl } = form

  return (
    <div className="min-h-screen pb-28" style={{ background: '#09090f' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', marginBottom: 24 }}>내 프로필</h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28, overflow: 'hidden',
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 24px rgba(6,182,212,0.3)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 32 }}>{name?.[0] ?? '?'}</span>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: '#0891b2', border: '2px solid #09090f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>📷</div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: 12, color: '#8888aa', marginTop: 8 }}>
            {avatarUploading ? '업로드 중...' : '사진 변경'}
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12, letterSpacing: 0.5 }}>기본 정보</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => updateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="이름 *" required style={inputStyle} />
              <div style={{ ...inputStyle, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: '#555570', fontWeight: 600 }}>생년월일</span>
                <input type="date" value={birthDate} onChange={e => updateForm(f => ({ ...f, birthDate: e.target.value }))}
                  style={{ border: 'none', outline: 'none', fontSize: 15, color: '#eeeeff', background: 'transparent', width: '100%', padding: 0, colorScheme: 'dark' }} />
              </div>
              <select value={gender} onChange={e => updateForm(f => ({ ...f, gender: e.target.value }))} style={inputStyle}>
                <option value="">성별 선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
              <select value={nationality} onChange={e => updateForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                <option value="">국적 선택</option>
                <optgroup label="아시아">
                  <option value="대한민국">대한민국</option>
                  <option value="조선민주주의인민공화국">북한</option>
                  <option value="중국">중국</option>
                  <option value="일본">일본</option>
                  <option value="대만">대만</option>
                  <option value="홍콩">홍콩</option>
                  <option value="태국">태국</option>
                  <option value="베트남">베트남</option>
                  <option value="필리핀">필리핀</option>
                  <option value="인도네시아">인도네시아</option>
                  <option value="말레이시아">말레이시아</option>
                  <option value="싱가포르">싱가포르</option>
                  <option value="미얀마">미얀마</option>
                  <option value="캄보디아">캄보디아</option>
                  <option value="몽골">몽골</option>
                  <option value="인도">인도</option>
                  <option value="파키스탄">파키스탄</option>
                  <option value="방글라데시">방글라데시</option>
                  <option value="카자흐스탄">카자흐스탄</option>
                  <option value="우즈베키스탄">우즈베키스탄</option>
                </optgroup>
                <optgroup label="북미/남미">
                  <option value="미국">미국</option>
                  <option value="캐나다">캐나다</option>
                  <option value="멕시코">멕시코</option>
                  <option value="브라질">브라질</option>
                  <option value="아르헨티나">아르헨티나</option>
                  <option value="콜롬비아">콜롬비아</option>
                  <option value="칠레">칠레</option>
                  <option value="페루">페루</option>
                </optgroup>
                <optgroup label="유럽">
                  <option value="영국">영국</option>
                  <option value="프랑스">프랑스</option>
                  <option value="독일">독일</option>
                  <option value="스페인">스페인</option>
                  <option value="이탈리아">이탈리아</option>
                  <option value="포르투갈">포르투갈</option>
                  <option value="네덜란드">네덜란드</option>
                  <option value="벨기에">벨기에</option>
                  <option value="스웨덴">스웨덴</option>
                  <option value="노르웨이">노르웨이</option>
                  <option value="덴마크">덴마크</option>
                  <option value="핀란드">핀란드</option>
                  <option value="폴란드">폴란드</option>
                  <option value="러시아">러시아</option>
                  <option value="우크라이나">우크라이나</option>
                </optgroup>
                <optgroup label="오세아니아/중동/아프리카">
                  <option value="호주">호주</option>
                  <option value="뉴질랜드">뉴질랜드</option>
                  <option value="사우디아라비아">사우디아라비아</option>
                  <option value="아랍에미리트">아랍에미리트</option>
                  <option value="이스라엘">이스라엘</option>
                  <option value="터키">터키</option>
                  <option value="이란">이란</option>
                  <option value="이집트">이집트</option>
                  <option value="남아프리카공화국">남아프리카공화국</option>
                  <option value="나이지리아">나이지리아</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>신체 정보</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" value={height} onChange={e => updateForm(f => ({ ...f, height: e.target.value }))}
                placeholder="키 (cm)" style={inputStyle} />
              <input type="number" value={weight} onChange={e => updateForm(f => ({ ...f, weight: e.target.value }))}
                placeholder="몸무게 (kg)" style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>특기</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skillOptions.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', transition: 'all 0.15s',
                    background: skills.includes(s) ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                    color: skills.includes(s) ? 'white' : '#8888aa',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>자기소개</p>
            <textarea value={bio} onChange={e => updateForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="기획사 담당자에게 나를 소개해보세요" rows={4}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {saveError && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{saveError}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-4 rounded-2xl disabled:opacity-50 transition active:scale-95"
            style={saved
              ? { background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', color: '#8888aa', fontSize: 17, fontWeight: 700 }
              : { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>
            {saving ? '저장 중...' : saved ? '✓ 저장완료' : '저장'}
          </button>

          <button type="button" onClick={handleLogout}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#555570', fontWeight: 700, fontSize: 15 }}>
            로그아웃
          </button>
        </form>
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}
