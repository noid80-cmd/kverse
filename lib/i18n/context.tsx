'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { type Lang, LANGS } from './translations'

const STORAGE_KEY = 'kpick-lang'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ko',
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')

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
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
