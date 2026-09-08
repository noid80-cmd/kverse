'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { type Lang, LANGS } from './translations'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'kpick-lang'
// 한 번 올려보낸 값을 매 페이지마다 다시 쓸 이유는 없다
const SYNCED_KEY = 'kpick-lang-synced'

// 푸시는 서버가 만들어 보내므로 수신자 언어를 서버가 알아야 한다.
// 화면 언어는 여전히 localStorage가 정답이고, 여기서는 그 값을 프로필에
// 복사만 한다 — 실패해도 화면은 아무 영향이 없어야 한다.
async function syncLangToProfile(lang: Lang) {
  try {
    if (sessionStorage.getItem(SYNCED_KEY) === lang) return
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) return
    await supabase.from('profiles').update({ lang }).eq('id', uid)
    sessionStorage.setItem(SYNCED_KEY, lang)
  } catch {
    // lang 컬럼이 아직 없는 환경도 있다. 알림 언어만 한국어로 떨어질 뿐이다.
  }
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ko',
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')
  // 첫 렌더의 'ko'는 아직 아무것도 정해지지 않은 상태다. 그대로 올려보내면
  // 영어 사용자의 프로필에 'ko'가 한 번 찍혔다가 고쳐진다.
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored && LANGS.includes(stored)) {
      setLangState(stored)
    } else {
      // auto-detect from browser
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('ja')) setLangState('ja')
      else if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) setLangState('zh-TW')
      else if (browserLang.startsWith('zh')) setLangState('zh')
      else if (browserLang.startsWith('th')) setLangState('th')
      else if (browserLang.startsWith('id')) setLangState('id')
      else if (browserLang.startsWith('vi')) setLangState('vi')
      else if (browserLang.startsWith('tl') || browserLang.startsWith('fil')) setLangState('tl')
      else if (browserLang.startsWith('es')) setLangState('es')
      else if (browserLang.startsWith('ko')) setLangState('ko')
      else setLangState('en')
    }
    setResolved(true)
  }, [])

  // 감지로 정해진 언어도 프로필에 남겨야 알림이 그 언어로 간다
  useEffect(() => { if (resolved) void syncLangToProfile(lang) }, [resolved, lang])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
