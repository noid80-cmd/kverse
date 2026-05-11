'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getActiveAccountId } from '@/lib/activeAccount'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import { groupDisplayName } from '@/lib/groupThemes'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import KverseLogo from '@/app/components/KverseLogo'

const MAX_DURATION_SEC = 300 // 5분

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
  const [account, setAccount] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'vocal' | 'dance'>('vocal')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const activeId = getActiveAccountId()
      let q = supabase.from('accounts').select('*, groups(name)').eq('user_id', user.id)
      if (activeId) q = q.eq('id', activeId)
      const { data } = await q.limit(1).single()

      if (!data) { router.push('/select-account'); return }
      setAccount(data)
    }
    load()
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (!f.type.startsWith('video/')) {
      setError(t('upload.errVideoOnly'))
      return
    }
    if (f.size > 200 * 1024 * 1024) {
      setError(t('upload.errSize'))
      return
    }

    try {
      const duration = await getVideoDuration(f)
      if (duration > MAX_DURATION_SEC) {
        const m = Math.floor(duration / 60)
        const s = Math.floor(duration % 60)
        setError(t('upload.errDuration', { m, s }))
        e.target.value = ''
        return
      }
    } catch {
      setError(t('upload.errRead'))
      return
    }

    setFile(f)
    setError('')
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file || !title.trim() || !account) return
    setError('')
    setUploading(true)
    setProgress(10)

    const ext = file.name.split('.').pop()
    const fileName = `${account.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, { upsert: false })

    if (uploadError) {
      setError(t('upload.errUpload') + uploadError.message)
      setUploading(false)
      return
    }

    setProgress(70)

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('videos').insert({
      account_id: account.id,
      group_id: account.group_id,
      category,
      title: title.trim(),
      video_url: publicUrl,
    })

    setProgress(100)

    if (dbError) {
      setError(t('upload.errSave') + dbError.message)
    } else {
      router.push('/feed')
    }
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠 {t('nav.home')}</Link>
            <Link href="/feed" className="text-white/40 hover:text-white transition text-sm">{t('nav.back')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <KverseLogo />
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-8">{t('upload.title')}</h1>

        {!isMobile && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6 text-center">
            <div className="text-3xl mb-2">📱</div>
            <p className="text-red-400 font-medium text-sm">{t('upload.mobileOnly')}</p>
            <p className="text-white/40 text-xs mt-1">{t('upload.mobileNote')}</p>
          </div>
        )}

        {account && (
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 mb-6 text-sm text-pink-300">
            📌 {t('upload.groupOnly', { group: groupDisplayName(account.groups.name, locale) })}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* 카테고리 선택 */}
          <div>
            <label className="text-white/60 text-sm mb-3 block">{t('upload.category')}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setCategory('vocal')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                  category === 'vocal'
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                🎤 {t('common.vocal')}
              </button>
              <button
                onClick={() => setCategory('dance')}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                  category === 'dance'
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                💃 {t('common.dance')}
              </button>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">{t('upload.titleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('upload.titlePlaceholder')}
              maxLength={50}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          {/* 영상 선택 */}
          <div>
            <label className="text-white/60 text-sm mb-3 block">{t('upload.videoLabel')}</label>
            {preview ? (
              <div className="relative rounded-xl overflow-hidden">
                <video src={preview} controls className="w-full rounded-xl" />
                <button
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full"
                >
                  {t('upload.change')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!isMobile}
                className="w-full border-2 border-dashed border-white/20 rounded-xl py-12 flex flex-col items-center gap-3 hover:border-pink-500/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-4xl">🎬</span>
                <span className="text-white/50 text-sm">{t('upload.tapCamera')}</span>
                <span className="text-white/25 text-xs">{t('upload.maxInfo')}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {uploading && (
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ background: 'linear-gradient(90deg, #E91E8C, #7B2FBE)', width: `${progress}%` }}
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || !title.trim() || uploading || !isMobile}
            className="w-full disabled:opacity-40 text-white font-medium py-4 rounded-xl transition text-lg"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
          >
            {uploading ? t('upload.uploading', { pct: progress }) : t('upload.btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
