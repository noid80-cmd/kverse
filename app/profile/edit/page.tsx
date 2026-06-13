'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { Home, Compass, Plus, Bell, Megaphone } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT, LANG_LABELS, LANGS, type Lang } from '@/lib/i18n/translations'

const inputStyle = {
  width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff',
}

const SKILL_KEYS = ['보컬', '댄스', '랩', '연기', '작사', '작곡', '악기', '퍼포먼스'] as const

export default function ProfileEditPage() {
  const router = useRouter()
  const { lang, setLang } = useLang()
  const tx = useT(lang)

  const skillLabels: Record<string, string> = {
    '보컬': tx.profile.skillVocal, '댄스': tx.profile.skillDance,
    '랩': tx.profile.skillRap, '연기': tx.profile.skillActing,
    '작사': tx.profile.skillLyrics, '작곡': tx.profile.skillCompose,
    '악기': tx.profile.skillInstrument, '퍼포먼스': tx.profile.skillPerformance,
  }

  const talentNav = [
    { href: '/dashboard', label: tx.nav.home, icon: <Home size={22} strokeWidth={1.8} /> },
    { href: '/explore', label: tx.nav.explore, icon: <Compass size={22} strokeWidth={1.8} /> },
    { href: '/dashboard/auditions', label: tx.nav.auditions, icon: <Megaphone size={22} strokeWidth={1.8} /> },
    { href: '/videos/upload', label: tx.nav.upload, icon: <Plus size={22} strokeWidth={1.8} /> },
    { href: '/reactions', label: tx.nav.activity, icon: <Bell size={22} strokeWidth={1.8} /> },
  ]

  type ProfileForm = { name: string; bio: string; birthDate: string; gender: string; height: string; weight: string; nationality: string; skills: string[]; avatarUrl: string | null; userId: string }
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [original, setOriginal] = useState<ProfileForm | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const supabase = createClient()

  const isDirty = form && original && (
    form.name !== original.name ||
    form.bio !== original.bio ||
    form.birthDate !== original.birthDate ||
    form.gender !== original.gender ||
    form.height !== original.height ||
    form.weight !== original.weight ||
    form.nationality !== original.nationality ||
    JSON.stringify(form.skills) !== JSON.stringify(original.skills)
  )

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const loaded: ProfileForm = {
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
      }
      setForm(loaded)
      setOriginal(loaded)
    }
    load()
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !form?.userId) return
    setAvatarUploading(true)
    setSaveError('')

    try {
      setSaveError('')
      const urlRes = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `avatar_${form.userId}_${Date.now()}.jpg`, contentType: 'image/jpeg' }),
      })
      if (!urlRes.ok) throw new Error(`1단계 실패 (${urlRes.status})`)
      const { url: presignedUrl, publicUrl } = await urlRes.json()

      const uploadRes = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: file })
      if (!uploadRes.ok) throw new Error(`2단계 실패 (${uploadRes.status})`)

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('세션 만료 - 다시 로그인해주세요')

      const { error: dbError, data: updated } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)
        .select('id')
      if (dbError) throw new Error('DB 오류: ' + dbError.message)
      if (!updated || updated.length === 0) throw new Error('저장 실패: RLS (0 rows)')

      const { data: check } = await supabase.from('profiles').select('avatar_url').eq('id', currentUser.id).single()
      const saved = check?.avatar_url === publicUrl
      setSaveError(saved ? '✓ 사진 저장 확인됨' : '✗ DB에 이전 사진 그대로 (' + (check?.avatar_url?.slice(-15) ?? 'null') + ')')

      setForm(f => f ? { ...f, avatarUrl: check?.avatar_url ?? publicUrl } : f)
      try { localStorage.removeItem('kpick-dashboard-v4') } catch {}
      router.refresh()
    } catch (err: any) {
      setSaveError('오류: ' + (err.message ?? '알 수 없는 오류'))
    }

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
    else { setSaved(true); setOriginal(form); router.refresh() }
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

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#eeeeff', marginBottom: 24 }}>{tx.profile.myProfile}</h1>

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
            {avatarUploading ? tx.profile.avatarUploading : tx.profile.changePhoto}
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12, letterSpacing: 0.5 }}>{tx.profile.basicInfo}</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => updateForm(f => ({ ...f, name: e.target.value }))}
                placeholder={tx.profile.nameRequired} required style={inputStyle} />
              <div style={{ ...inputStyle, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: '#555570', fontWeight: 600 }}>{tx.profile.birthDate}</span>
                <input type="date" value={birthDate} onChange={e => updateForm(f => ({ ...f, birthDate: e.target.value }))}
                  style={{ border: 'none', outline: 'none', fontSize: 15, color: '#eeeeff', background: 'transparent', width: '100%', padding: 0, colorScheme: 'dark' }} />
              </div>
              <select value={gender} onChange={e => updateForm(f => ({ ...f, gender: e.target.value }))} style={inputStyle}>
                <option value="">{tx.profile.selectGender}</option>
                <option value="male">{tx.profile.genderMale}</option>
                <option value="female">{tx.profile.genderFemale}</option>
                <option value="other">{tx.profile.genderOther}</option>
              </select>
              <select value={nationality} onChange={e => updateForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                <option value="">{tx.profile.selectNationality}</option>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>{tx.profile.bodyInfo}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" value={height} onChange={e => updateForm(f => ({ ...f, height: e.target.value }))}
                placeholder={tx.profile.heightPlaceholder} style={inputStyle} />
              <input type="number" value={weight} onChange={e => updateForm(f => ({ ...f, weight: e.target.value }))}
                placeholder={tx.profile.weightPlaceholder} style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>{tx.profile.skillsLabel}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILL_KEYS.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', transition: 'all 0.15s',
                    background: skills.includes(s) ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : '#1a1a25',
                    color: skills.includes(s) ? 'white' : '#8888aa',
                  }}>
                  {skillLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12 }}>{tx.profile.aboutMe}</p>
            <textarea value={bio} onChange={e => updateForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={tx.profile.bioPlaceholderLong} rows={4}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {saveError && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{saveError}</p>}

          <button type="submit" disabled={saving || avatarUploading || !isDirty}
            className="w-full py-4 rounded-2xl disabled:opacity-50 transition active:scale-95"
            style={saved
              ? { background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', color: '#8888aa', fontSize: 17, fontWeight: 700 }
              : { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(6,182,212,0.35)' }}>
            {saving ? tx.profile.saving : saved ? tx.profile.saveDone : tx.profile.saveBtn}
          </button>

          <button type="button" onClick={handleLogout}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#555570', fontWeight: 700, fontSize: 15 }}>
            {tx.profile.logout}
          </button>
        </form>

        <div style={{ background: '#111118', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#555570', marginBottom: 12, letterSpacing: 0.5 }}>{tx.settings.language}</p>
          <select value={lang} onChange={e => setLang(e.target.value as Lang)}
            style={{ width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#eeeeff', cursor: 'pointer' }}>
            {LANGS.map(l => (
              <option key={l} value={l}>{LANG_LABELS[l as Lang]}</option>
            ))}
          </select>
        </div>
      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}
