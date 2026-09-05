'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { useTalentNav } from '@/components/layout/talentNav'
import {BellOff, BellRing, X, Lock, Globe } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT, type Lang } from '@/lib/i18n/translations'
import DeleteAccountButton from '@/components/DeleteAccountButton'

const inputStyle = {
  width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#241C15',
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

  const talentNav = useTalentNav()

  type ProfileForm = { name: string; bio: string; instagram: string; phone: string; birthDate: string; gender: string; height: string; weight: string; nationality: string; skills: string[]; avatarUrl: string | null; userId: string }
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notifModal, setNotifModal] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission)
  }, [])

  useEffect(() => {
    async function load() {
      const user = (await supabase.auth.getSession()).data.session?.user
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const loaded: ProfileForm = {
        userId: user.id,
        name: data?.name ?? '',
        bio: data?.bio ?? '',
        instagram: data?.instagram ?? '',
        phone: data?.phone ?? '',
        birthDate: data?.birth_date ?? '',
        gender: data?.gender ?? '',
        height: data?.height?.toString() ?? '',
        weight: data?.weight?.toString() ?? '',
        nationality: data?.nationality ?? '',
        skills: data?.skills ?? [],
        avatarUrl: data?.avatar_url ?? null,
      }
      setForm(loaded)
      setIsDirty(false)
    }
    load()
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !form?.userId) return
    setAvatarUploading(true)
    setAvatarStatus({ msg: '1/3 변환 중...', ok: true })

    try {
      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        const blobUrl = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(blobUrl)
          const MAX = 720
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('캔버스 오류')); return }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('변환 실패')), 'image/jpeg', 0.85)
        }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('이미지 로드 실패')) }
        img.src = blobUrl
      })

      setAvatarStatus({ msg: `2/3 업로드 중... (${Math.round(jpegBlob.size / 1024)}KB)`, ok: true })

      const urlRes = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `avatar_${form.userId}_${Date.now()}.jpg`, contentType: 'image/jpeg' }),
      })
      if (!urlRes.ok) throw new Error(`URL 요청 실패 (${urlRes.status})`)
      const { url: presignedUrl, publicUrl } = await urlRes.json()

      const uploadRes = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: jpegBlob })
      if (!uploadRes.ok) throw new Error(`R2 업로드 실패 (${uploadRes.status})`)

      setAvatarStatus({ msg: '3/3 DB 저장 중...', ok: true })

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('세션 만료 — 다시 로그인')

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)
      if (dbError) throw new Error('DB 오류: ' + dbError.message)

      setForm(f => f ? { ...f, avatarUrl: publicUrl } : f)
      try {
        const raw = localStorage.getItem('kpick-dashboard-v4')
        if (raw) {
          const cached = JSON.parse(raw)
          if (cached?.profile) { cached.profile.avatar_url = publicUrl; localStorage.setItem('kpick-dashboard-v4', JSON.stringify(cached)) }
        } else {
          localStorage.removeItem('kpick-dashboard-v4')
        }
      } catch {}

      setAvatarStatus({ msg: '✓ 완료! 홈으로 이동 중...', ok: true })
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    } catch (err: any) {
      setAvatarStatus({ msg: '✗ ' + (err.message ?? '오류'), ok: false })
    }

    setAvatarUploading(false)
  }

  function updateForm(updater: (f: ProfileForm) => ProfileForm) {
    setSaved(false)
    setIsDirty(true)
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
    // 연락처는 따로 저장한다. instagram 컬럼이 아직 없는 환경에서도 나머지
    // 저장이 통째로 실패하지 않게 하려는 것 — 마이그레이션 순서에 코드가
    // 매달리면 배포할 때마다 순서를 맞춰야 한다.
    await supabase.from('profiles').update({
      instagram: form.instagram.trim().replace(/^@/, '') || null,
      phone: form.phone.trim() || null,
    }).eq('id', form.userId)

    setSaving(false)
    if (error) { setSaveError('저장 실패: ' + error.message) }
    else { setSaved(true); setIsDirty(false); router.refresh() }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!form) return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(36,28,21,0.1)', borderTop: '3px solid #D84A1E', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  const { name, bio, instagram, phone, birthDate, gender, height, weight, nationality, skills, avatarUrl } = form

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FFF8E7' }}>
      <div className="max-w-lg mx-auto px-4 pt-10">

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15', marginBottom: 24 }}>{tx.profile.myProfile}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28, overflow: 'hidden',
              background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(36,28,21,0.13)', boxShadow: '0 4px 24px rgba(255,111,60,0.3)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 900, fontSize: 32 }}>{name?.[0] ?? '?'}</span>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: '#D84A1E', border: '2px solid #FFF8E7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>📷</div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
          {avatarStatus ? (
            <p style={{ fontSize: 13, color: avatarStatus.ok ? '#4ade80' : '#DC2626', marginTop: 8, fontWeight: 700, textAlign: 'center' }}>
              {avatarStatus.msg}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#8A7F6E', marginTop: 8 }}>
              {avatarUploading ? tx.profile.avatarUploading : tx.profile.changePhoto}
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,111,60,0.07)', border: '1px solid rgba(255,111,60,0.15)', borderRadius: 12 }}>
            <span style={{ fontSize: 15 }}>🏢</span>
            <span style={{ fontSize: 12, color: '#D84A1E', fontWeight: 600 }}>{tx.profile.bodyInfoNote}</span>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12, letterSpacing: 0.5 }}>{tx.profile.basicInfo}</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => updateForm(f => ({ ...f, name: e.target.value }))}
                placeholder={tx.profile.nameRequired} required style={inputStyle} />
              <div style={{ ...inputStyle, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: '#8A7F6E', fontWeight: 600 }}>{tx.profile.birthDate}</span>
                <input type="date" value={birthDate} onChange={e => updateForm(f => ({ ...f, birthDate: e.target.value }))}
                  style={{ border: 'none', outline: 'none', fontSize: 15, color: '#241C15', background: 'transparent', width: '100%', padding: 0, colorScheme: 'dark' }} />
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

          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12 }}>{tx.profile.bodyInfo}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" value={height} onChange={e => updateForm(f => ({ ...f, height: e.target.value }))}
                placeholder={tx.profile.heightPlaceholder} style={inputStyle} />
              <input type="number" value={weight} onChange={e => updateForm(f => ({ ...f, weight: e.target.value }))}
                placeholder={tx.profile.weightPlaceholder} style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12 }}>{tx.profile.skillsLabel}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILL_KEYS.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', transition: 'all 0.15s',
                    background: skills.includes(s) ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : '#FFFFFF',
                    color: skills.includes(s) ? 'white' : '#8A7F6E',
                  }}>
                  {skillLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', margin: 0 }}>{tx.profile.aboutMe}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2F7A4F', fontWeight: 700, background: 'rgba(47,122,79,0.08)', padding: '3px 8px', borderRadius: 6 }}><Globe size={11} strokeWidth={2.2} /> 전체 공개</span>
            </div>
            <textarea value={bio} onChange={e => updateForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={tx.profile.bioPlaceholderLong} rows={4}
              style={{ ...inputStyle, resize: 'none' }} />
            <p style={{ fontSize: 12, color: '#8A7F6E', margin: '8px 0 0', lineHeight: 1.5 }}>
              연락처는 아래 칸에 적어주세요. 여기 적으면 누구나 볼 수 있어요.
            </p>
          </div>

          {/* 연락처 — 지망생이 자기소개에 인스타를 적는 건 적을 데가 없어서다.
              칸을 만들어주고 "1차 합격한 곳만 본다"를 알려주면 거기 쓴다. */}
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', margin: 0 }}>연락처</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#D84A1E', fontWeight: 700, background: 'rgba(216,74,30,0.08)', padding: '3px 8px', borderRadius: 6 }}>
                <Lock size={11} strokeWidth={2.2} /> 1차 합격한 기획사만
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#8A7F6E', margin: '0 0 12px', lineHeight: 1.5 }}>
              여기 적은 건 1차 합격시킨 기획사에게만 보여요. 다른 사람에게는 보이지 않습니다.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: '#8A7F6E', fontWeight: 700 }}>@</span>
              <input type="text" value={instagram}
                onChange={e => updateForm(f => ({ ...f, instagram: e.target.value }))}
                placeholder="인스타그램 아이디" style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input type="text" value={phone}
              onChange={e => updateForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="카톡 아이디나 전화번호 (선택)" style={inputStyle} />
          </div>

          {saveError && <p style={{ color: '#DC2626', fontSize: 14, textAlign: 'center' }}>{saveError}</p>}

          <button type="submit" disabled={saving || avatarUploading || !isDirty}
            className="w-full py-4 rounded-2xl disabled:opacity-50 transition active:scale-95"
            style={saved
              ? { background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.13)', color: '#8A7F6E', fontSize: 17, fontWeight: 700 }
              : { background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', border: 'none', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 16px rgba(255,111,60,0.35)' }}>
            {saving ? tx.profile.saving : saved ? tx.profile.saveDone : tx.profile.saveBtn}
          </button>

          <button type="button" onClick={() => setNotifModal(true)}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(36,28,21,0.1)', color: notifPerm === 'denied' ? '#DC2626' : '#8A7F6E', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {notifPerm === 'denied' ? <BellOff size={17} strokeWidth={1.8} /> : <BellRing size={17} strokeWidth={1.8} />}
            알림 설정
            <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 'auto', color: notifPerm === 'granted' ? '#D84A1E' : notifPerm === 'denied' ? '#DC2626' : '#8A7F6E' }}>
              {notifPerm === 'granted' ? '켜짐' : notifPerm === 'denied' ? '차단됨' : '꺼짐'}
            </span>
          </button>

          <button type="button" onClick={handleLogout}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'none', border: '1px solid rgba(36,28,21,0.1)', color: '#8A7F6E', fontWeight: 700, fontSize: 15 }}>
            {tx.profile.logout}
          </button>

          <DeleteAccountButton />
        </form>

        {notifModal && (
          <>
            <div onClick={() => setNotifModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
            <div style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
              background: '#FFFCF6', borderRadius: '24px 24px 0 0',
              padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(36,28,21,0.1)', maxWidth: 480, margin: '0 auto',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(36,28,21,0.2)', margin: '0 auto 24px' }} />
              <button onClick={() => setNotifModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(36,28,21,0.08)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8A7F6E' }}>
                <X size={16} strokeWidth={2} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                  background: notifPerm === 'granted' ? 'linear-gradient(135deg, #D84A1E, #FF6F3C)' : notifPerm === 'denied' ? 'rgba(248,113,113,0.15)' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notifPerm === 'denied'
                    ? <BellOff size={24} strokeWidth={1.8} color="#DC2626" />
                    : <BellRing size={24} strokeWidth={1.8} color={notifPerm === 'granted' ? 'white' : '#8A7F6E'} />
                  }
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 3 }}>알림 설정</div>
                  <div style={{ fontSize: 13, color: notifPerm === 'granted' ? '#D84A1E' : notifPerm === 'denied' ? '#DC2626' : '#8A7F6E' }}>
                    {notifPerm === 'granted' ? '알림이 켜져 있어요' : notifPerm === 'denied' ? '알림이 차단되어 있어요' : '알림이 꺼져 있어요'}
                  </div>
                </div>
              </div>

              {notifPerm === 'denied' ? (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: '#fca5a5', fontWeight: 700, marginBottom: 10 }}>브라우저 설정에서 직접 허용해주세요</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Chrome', desc: '주소창 왼쪽 자물쇠 🔒 → 알림 → 허용' },
                      { label: 'Safari (iOS)', desc: '설정 앱 → Safari → kpick.app → 알림 허용' },
                    ].map(item => (
                      <div key={item.label}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{item.label}</span>
                        <p style={{ fontSize: 12, color: '#8A7F6E', margin: '2px 0 0' }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : notifPerm === 'granted' ? (
                <div style={{ background: 'rgba(255,111,60,0.08)', border: '1px solid rgba(255,111,60,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: '#D84A1E', margin: 0 }}>기획사 관심, 채팅, 오디션 공고 알림을 받고 있어요.</p>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <button onClick={async () => {
                    const perm = await Notification.requestPermission()
                    setNotifPerm(perm)
                  }} style={{
                    width: '100%', padding: '15px',
                    background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                    border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255,111,60,0.35)',
                  }}>
                    알림 켜기
                  </button>
                </div>
              )}

              <button onClick={() => setNotifModal(false)} style={{ width: '100%', padding: '13px', background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </>
        )}

      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

