'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getAuthUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import { GROUP_THEMES, groupDisplayName } from '@/lib/groupThemes'
import KverseLogo from '@/app/components/KverseLogo'

const MAX_DURATION_SEC = 300

const ALL_GROUPS = Object.entries(GROUP_THEMES).map(([name, theme]) => ({
  name, emoji: theme.emoji, gradient: theme.gradient, primary: theme.primary,
}))

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration) }
    video.onerror = () => { URL.revokeObjectURL(url); reject() }
    video.src = url
  })
}

export default function UploadPage() {
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguage()
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  const [accountId, setAccountId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'vocal' | 'dance'>('vocal')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [agreedOriginal, setAgreedOriginal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    if (preview && previewRef.current) previewRef.current.load()
  }, [preview])

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('accounts').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!data) { router.push('/signup'); return }
      setAccountId(data.id)
      const groupParam = new URLSearchParams(window.location.search).get('group')
      if (groupParam) handleGroupSelect(groupParam)
    }
    load()
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('video/')) { setError(t('upload.errVideoOnly')); return }
    if (f.size > 500 * 1024 * 1024) { setError(t('upload.errSize')); return }
    try {
      const dur = await getVideoDuration(f)
      if (dur > MAX_DURATION_SEC) {
        setError(t('upload.errDuration', { m: Math.floor(dur / 60), s: Math.floor(dur % 60) }))
        e.target.value = ''
        return
      }
      setDuration(dur)
      setTrimStart(0)
      setTrimEnd(dur)
    } catch {
      setError(t('upload.errRead')); return
    }
    setFile(f)
    setError('')
    setPreview(URL.createObjectURL(f))
  }

  async function handleGroupSelect(groupName: string) {
    setSelectedGroup(groupName)
    const { data } = await supabase.from('groups').select('id').eq('name', groupName).maybeSingle()
    setSelectedGroupId(data?.id || null)
  }

  async function handleUpload() {
    if (!file || !title.trim() || !accountId || !selectedGroupId) return
    setError('')
    setUploading(true)
    setProgress(10)

    const ext = file.name.split('.').pop()
    const fileName = `${accountId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file, { upsert: false })
    if (uploadError) { setError(t('upload.errUpload') + uploadError.message); setUploading(false); return }

    setProgress(70)
    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('videos').insert({
      account_id: accountId,
      group_id: selectedGroupId,
      category,
      title: title.trim(),
      video_url: publicUrl,
      is_private: isPrivate,
      trim_start: trimStart > 0 ? trimStart : null,
      trim_end: trimEnd < duration ? trimEnd : null,
    })

    setProgress(100)
    if (dbError) {
      setError(t('upload.errSave') + dbError.message)
    } else {
      localStorage.setItem('justUploaded', '1')
      router.push(`/universe/${encodeURIComponent(selectedGroup)}`)
    }
    setUploading(false)
  }

  const trimDuration = trimEnd - trimStart
  const trimOverLimit = trimDuration > MAX_DURATION_SEC
  const canUpload = !!file && !!title.trim() && !!selectedGroup && !!selectedGroupId && !uploading && !trimOverLimit && agreedOriginal

  return (
    <div className="min-h-screen bg-black">
      <nav className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-6 py-4 grid grid-cols-3 items-center">
        <button onClick={() => window.history.back()} className="text-white/40 hover:text-white transition text-sm text-left">{t('nav.backBtn')}</button>
        <div className="flex justify-center"><Link href="/"><KverseLogo /></Link></div>
        <div className="flex justify-end">
          <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.mySns')}</Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-2xl font-black text-white mb-2">{t('upload.title')}</h1>
        <p className="text-white/25 text-xs italic mb-8">No filters. No edits. Just you.</p>

        <div className="flex flex-col gap-6">

          {/* 아티스트 선택 */}
          <div>
            <label className="text-white/60 text-sm mb-3 block">{t('upload.whichArtist')}</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_GROUPS.map((g) => {
                const isSelected = selectedGroup === g.name
                const accent = g.primary === '#FFFFFF' ? '#C9A96E' : g.primary
                return (
                  <button key={g.name} onClick={() => handleGroupSelect(g.name)}
                    className="relative rounded-xl py-3 px-2 text-center transition border-2 flex flex-col items-center gap-1"
                    style={isSelected ? { background: g.gradient, borderColor: 'transparent' } : { background: `${accent}10`, borderColor: `${accent}25` }}>
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-xs font-medium text-white leading-tight">{groupDisplayName(g.name, locale)}</span>
                    {isSelected && <span className="absolute top-1 right-1.5 text-white text-[10px]">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <label className="text-white/60 text-sm mb-3 block">{t('upload.category')}</label>
            <div className="flex gap-3">
              <button onClick={() => setCategory('vocal')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${category === 'vocal' ? 'border-pink-500 bg-pink-500/20 text-pink-300' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                🎤 {t('common.vocal')}
              </button>
              <button onClick={() => setCategory('dance')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${category === 'dance' ? 'border-pink-500 bg-pink-500/20 text-pink-300' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                💃 {t('common.dance')}
              </button>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">{t('upload.titleLabel')}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t('upload.titlePlaceholder')} maxLength={50}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition" />
          </div>

          {/* 영상 선택 */}
          <div>
            <label className="text-white/60 text-sm mb-3 block">{t('upload.videoLabel')}</label>
            {preview ? (
              <div className="flex flex-col gap-4">
                <div className="relative rounded-xl overflow-hidden">
                  <video ref={previewRef} src={preview} controls preload="auto" className="w-full rounded-xl" />
                  <button onClick={() => { setFile(null); setPreview(null) }}
                    className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                    {t('upload.change')}
                  </button>
                </div>

                <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/60 text-xs font-medium">{t('upload.trimSection')} <span className="text-white/30 ml-1">{fmtTime(trimStart)} ~ {fmtTime(trimEnd)}</span></p>
                    {trimOverLimit && <span className="text-red-400 text-xs font-medium">{t('upload.trimOver', { dur: fmtTime(trimDuration) })}</span>}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-xs w-10">{t('upload.trimStart')}</span>
                      <input type="range" min={0} max={duration} step={0.1} value={trimStart}
                        onChange={e => { const v = parseFloat(e.target.value); setTrimStart(v); if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = v } }}
                        className="flex-1 accent-pink-500" />
                      <span className="text-white/50 text-xs w-10 text-right">{fmtTime(trimStart)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-xs w-10">{t('upload.trimEnd')}</span>
                      <input type="range" min={0} max={duration} step={0.1} value={trimEnd}
                        onChange={e => { const v = parseFloat(e.target.value); setTrimEnd(v); if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = v } }}
                        className="flex-1 accent-pink-500" />
                      <span className="text-white/50 text-xs w-10 text-right">{fmtTime(trimEnd)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-white/15 rounded-xl py-14 flex flex-col items-center gap-3 transition hover:border-white/30">
                <span className="text-4xl">📹</span>
                <span className="text-white/50 text-sm">{t('upload.normalModeDesc')}</span>
                <span className="text-white/25 text-xs">{t('upload.maxInfo')}</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* 공개/비공개 */}
          <button onClick={() => setIsPrivate(p => !p)}
            className={`w-full py-3 px-4 rounded-xl border-2 font-medium transition text-sm flex items-center justify-between ${isPrivate ? 'border-white/20 bg-white/5 text-white/60' : 'border-pink-500/40 bg-pink-500/10 text-pink-300'}`}>
            <span>{isPrivate ? t('upload.private') : t('upload.public')}</span>
            <span className="text-xs opacity-60">{isPrivate ? t('upload.privateDesc') : t('upload.publicDesc')}</span>
          </button>

          {/* 원본 동의 */}
          <button onClick={() => setAgreedOriginal(p => !p)}
            className="w-full flex items-start gap-3 p-4 rounded-xl border-2 transition text-left"
            style={agreedOriginal
              ? { borderColor: 'rgba(236,72,153,0.5)', background: 'rgba(236,72,153,0.08)' }
              : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition"
              style={agreedOriginal
                ? { background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)', borderColor: 'transparent' }
                : { borderColor: 'rgba(255,255,255,0.2)' }}>
              {agreedOriginal && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{t('upload.originalAgree')}</p>
              <p className="text-white/40 text-xs mt-0.5">No filters. No edits. Just you.</p>
            </div>
          </button>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {uploading && (
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ background: 'linear-gradient(90deg, #E91E8C, #7B2FBE)', width: `${progress}%` }} />
            </div>
          )}

          <button onClick={handleUpload} disabled={!canUpload}
            className="w-full disabled:opacity-40 text-white font-bold py-4 rounded-xl transition text-base"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}>
            {uploading ? t('upload.uploading', { pct: progress }) : t('upload.btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
