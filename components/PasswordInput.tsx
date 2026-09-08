'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLang } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/translations'

// 비밀번호가 안 보이면 오타를 잡을 수가 없다. 특히 새 비밀번호를 두 번
// 입력하는 화면에서는 "일치하지 않습니다"만 반복되고, 어디가 틀렸는지
// 알 방법이 없어서 사용자는 결국 포기한다.
//
// 기존 input을 그대로 감싸는 형태라 페이지마다 다른 style/className을
// 그대로 쓸 수 있다.
export default function PasswordInput({
  style,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const { lang } = useLang()
  const tx = useT(lang)
  const [shown, setShown] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...rest}
        type={shown ? 'text' : 'password'}
        style={{ ...style, paddingRight: 46 }}
      />
      <button
        type="button"
        onClick={() => setShown(v => !v)}
        aria-label={shown ? tx.common.hidePassword : tx.common.showPassword}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          width: 32, height: 32, borderRadius: 10, border: 'none', background: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(36,28,21,0.42)', cursor: 'pointer', padding: 0,
        }}
      >
        {shown ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
      </button>
    </div>
  )
}
