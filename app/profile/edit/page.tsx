'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/lib/capacitor'
import { enableNativeNotifications, nativeNotifState, turnOffNotifications } from '@/lib/pushNative'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import { useTalentNav } from '@/components/layout/talentNav'
import {BellOff, BellRing, X, Lock, Globe } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { COUNTRY_GROUPS, countryLabel, regionLabel } from '@/lib/countries'
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

// 전화번호 자동 하이픈. 이 칸은 카톡 아이디도 같이 받으므로, 숫자(와 하이픈)만
// 들어왔을 때에만 손댄다 - 아이디 중간에 하이픈이 끼면 그대로 저장돼서
// 기획사가 찾을 수 없는 아이디가 된다.
function formatPhone(v: string) {
  if (!/^[0-9-]*$/.test(v)) return v
  const d = v.replace(/[^0-9]/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.startsWith('02')) {
    if (d.length <= 5) return d.slice(0, 2) + '-' + d.slice(2)
    if (d.length <= 9) return d.slice(0, 2) + '-' + d.slice(2, 5) + '-' + d.slice(5)
    return d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6, 10)
  }
  if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3)
  if (d.length <= 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6)
  return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7, 11)
}

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
  const [notifError, setNotifError] = useState('')
  const supabase = createClient()

  // 앱(WKWebView)에는 Notification 객체가 없다. 웹 API로만 판단하면 앱에서는
  // 알림이 켜져 있어도 언제나 "꺼짐"으로 보인다.
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (isNativeApp()) {
        const st = await nativeNotifState()
        if (alive) setNotifPerm(st === 'granted' ? 'granted' : st === 'denied' ? 'denied' : 'default')
        return
      }
      if ('Notification' in window) setNotifPerm(Notification.permission)
    })()
    return () => { alive = false }
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
        phone: formatPhone(data?.phone ?? ''),
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
    setAvatarStatus({ msg: tx.profile.avatarStep1, ok: true })

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
          if (!ctx) { reject(new Error(tx.profile.avatarFailed)); return }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error(tx.profile.avatarFailed)), 'image/jpeg', 0.85)
        }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error(tx.profile.avatarFailed)) }
        img.src = blobUrl
      })

      setAvatarStatus({ msg: `${tx.profile.avatarStep2} (${Math.round(jpegBlob.size / 1024)}KB)`, ok: true })

      const urlRes = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `avatar_${form.userId}_${Date.now()}.jpg`, contentType: 'image/jpeg' }),
      })
      if (!urlRes.ok) throw new Error(`${tx.profile.avatarFailed} (${urlRes.status})`)
      const { url: presignedUrl, publicUrl } = await urlRes.json()

      const uploadRes = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: jpegBlob })
      if (!uploadRes.ok) throw new Error(`${tx.profile.avatarFailed} (${uploadRes.status})`)

      setAvatarStatus({ msg: tx.profile.avatarStep3, ok: true })

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error(tx.profile.sessionExpired)

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)
      if (dbError) throw new Error(tx.profile.avatarFailed + ': ' + dbError.message)

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

      setAvatarStatus({ msg: '✓ ' + tx.profile.avatarDone, ok: true })
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    } catch (err: any) {
      setAvatarStatus({ msg: '✗ ' + (err.message ?? tx.common.error), ok: false })
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
    if (error) { setSaveError(tx.profile.saveFailed + ': ' + error.message) }
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
      <div className="max-w-lg mx-auto px-4 kv-safe-top">

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

          {/* 공개 범위가 다른 칸을 한 화면에 섞어두면 어디까지 보이는지 칸마다
              다시 확인해야 한다. "누구나 보는 것"과 "기획사만 보는 것"을 두
              덩어리로 완전히 갈라놓고, 공개 범위는 덩어리마다 한 번만 적는다. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
            <Globe size={16} strokeWidth={2.2} color="#2F7A4F" />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#241C15' }}>{tx.profile.publicProfile}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2F7A4F', background: 'rgba(47,122,79,0.1)', padding: '3px 8px', borderRadius: 6 }}>{tx.profile.publicBadge}</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A7F6E', margin: '-8px 0 0', lineHeight: 1.5 }}>
            {tx.profile.publicDesc}
          </p>

          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(36,28,21,0.09)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12, letterSpacing: 0.5 }}>{tx.profile.nameLabel}</p>
            <div className="flex flex-col gap-3">
              <input type="text" value={name} onChange={e => updateForm(f => ({ ...f, name: e.target.value }))}
                placeholder={tx.profile.nameRequired} required style={inputStyle} />
              {/* 국적은 어느 나라 지망생인지 알아보는 값이라 지원서가 아니라
                  프로필에 속한다. 생년월일·성별과 달리 신상이라 할 것도 없다. */}
              <select value={nationality} onChange={e => updateForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                <option value="">{tx.profile.selectNationality}</option>
                {COUNTRY_GROUPS.map(g => (
                  <optgroup key={g.region} label={regionLabel(g.region, lang)}>
                    {g.items.map(c => (
                      <option key={c.code} value={c.ko}>{countryLabel(c, lang)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', margin: '0 0 8px' }}>{tx.profile.aboutMe}</p>
            {/* 주의는 칸 위에 둔다. 아래에 두면 다 쓰고 나서야 읽는다. */}
            <p style={{ fontSize: 12, color: '#8A7F6E', margin: '0 0 10px', lineHeight: 1.5 }}>
              <strong style={{ color: '#D84A1E' }}>{tx.profile.bioWarnStrong}</strong> {tx.profile.bioWarnRest}
            </p>
            <textarea value={bio} onChange={e => updateForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={tx.profile.bioPlaceholderLong} rows={4}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ height: 1, background: 'rgba(36,28,21,0.1)', margin: '14px 0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Lock size={16} strokeWidth={2.2} color="#D84A1E" />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#241C15' }}>{tx.profile.applyInfo}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#D84A1E', background: 'rgba(216,74,30,0.09)', padding: '3px 8px', borderRadius: 6 }}>{tx.profile.applyBadge}</span>
          </div>
          <p style={{ fontSize: 12, color: '#8A7F6E', margin: '-8px 0 0', lineHeight: 1.5 }}>
            {tx.profile.applyDesc}
          </p>

          <div style={{ background: 'rgba(255,111,60,0.05)', border: '1px solid rgba(255,111,60,0.16)', borderRadius: 24, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 18, border: '1px solid rgba(36,28,21,0.09)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12, letterSpacing: 0.5 }}>{tx.profile.basicInfo}</p>
              <div className="flex flex-col gap-3">
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
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 18, border: '1px solid rgba(36,28,21,0.09)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', marginBottom: 12 }}>{tx.profile.bodyInfo}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="number" value={height} onChange={e => updateForm(f => ({ ...f, height: e.target.value }))}
                  placeholder={tx.profile.heightPlaceholder} style={inputStyle} />
                <input type="number" value={weight} onChange={e => updateForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder={tx.profile.weightPlaceholder} style={inputStyle} />
              </div>
            </div>

            {/* 지망생이 자기소개에 인스타를 적는 건 적을 데가 없어서다. 칸을 만들어주면 거기 쓴다. */}
            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 18, border: '1px solid rgba(36,28,21,0.09)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F6E', margin: '0 0 12px' }}>{tx.profile.contact}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 15, color: '#8A7F6E', fontWeight: 700 }}>@</span>
                <input type="text" value={instagram}
                  onChange={e => updateForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder={tx.profile.instaPlaceholder} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <input type="text" inputMode="text" value={phone}
                onChange={e => updateForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder={tx.profile.phonePlaceholder} style={inputStyle} />
            </div>

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
            {tx.profile.notifSettings}
            <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 'auto', color: notifPerm === 'granted' ? '#D84A1E' : notifPerm === 'denied' ? '#DC2626' : '#8A7F6E' }}>
              {notifPerm === 'granted' ? tx.profile.notifStateOn : notifPerm === 'denied' ? tx.profile.notifStateBlocked : tx.profile.notifStateOff}
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
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#241C15', marginBottom: 3 }}>{tx.profile.notifSettings}</div>
                  <div style={{ fontSize: 13, color: notifPerm === 'granted' ? '#D84A1E' : notifPerm === 'denied' ? '#DC2626' : '#8A7F6E' }}>
                    {notifPerm === 'granted' ? tx.profile.notifDescOn : notifPerm === 'denied' ? tx.profile.notifDescBlocked : tx.profile.notifDescOff}
                  </div>
                </div>
              </div>

              {notifPerm === 'denied' ? (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: '#fca5a5', fontWeight: 700, marginBottom: 10 }}>{tx.profile.notifAllowManually}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Chrome', desc: tx.profile.notifChromeGuide },
                      { label: 'Safari (iOS)', desc: tx.profile.notifSafariGuide },
                    ].map(item => (
                      <div key={item.label}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>{item.label}</span>
                        <p style={{ fontSize: 12, color: '#8A7F6E', margin: '2px 0 0' }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : notifPerm === 'granted' ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ background: 'rgba(255,111,60,0.08)', border: '1px solid rgba(255,111,60,0.2)', borderRadius: 16, padding: '16px 18px' }}>
                    <p style={{ fontSize: 14, color: '#D84A1E', margin: 0 }}>{tx.profile.notifGrantedInfo}</p>
                  </div>
                  {/* 끌 방법이 없으면 받기 싫은 사람은 앱을 지운다. OS 권한 자체는
                      되돌릴 수 없지만, 발송 주소를 지우면 실제로 멈춘다. */}
                  <button onClick={async () => {
                    await turnOffNotifications()
                    setNotifPerm('default')
                    window.dispatchEvent(new Event('kpick-notif-changed'))
                  }} style={{
                    width: '100%', marginTop: 12, padding: '12px', borderRadius: 12,
                    border: '1px solid rgba(36,28,21,0.14)', background: '#FFFFFF',
                    color: '#8A7F6E', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {tx.profile.notifTurnOff}
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <button onClick={async () => {
                    setNotifError('')
                    if (isNativeApp()) {
                      const ok = await Promise.race([
                        enableNativeNotifications().catch(() => false),
                        new Promise<'timeout'>(r => setTimeout(() => r('timeout'), 15000)),
                      ])
                      if (ok === 'timeout') {
                        setNotifError(tx.profile.notifTimeout)
                        return
                      }
                      setNotifPerm(ok ? 'granted' : 'denied')
                      if (!ok) setNotifError(tx.profile.notifIosFail)
                      return
                    }
                    try {
                      const perm = await Notification.requestPermission()
                      setNotifPerm(perm)
                      if (perm !== 'granted') setNotifError(tx.profile.notifBrowserBlocked)
                    } catch {
                      setNotifError(tx.profile.notifUnsupported)
                    }
                  }} style={{
                    width: '100%', padding: '15px',
                    background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)',
                    border: 'none', borderRadius: 16, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255,111,60,0.35)',
                  }}>
                    {tx.profile.notifTurnOn}
                  </button>
                  {notifError && (
                    <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
                      {notifError}
                    </p>
                  )}
                </div>
              )}

              <button onClick={() => setNotifModal(false)} style={{ width: '100%', padding: '13px', background: 'none', border: 'none', color: '#8A7F6E', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {tx.common.close}
              </button>
            </div>
          </>
        )}

      </div>

      <BottomNav items={talentNav} />
    </div>
  )
}

