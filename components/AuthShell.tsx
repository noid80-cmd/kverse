'use client'

import type { CSSProperties, ReactNode } from 'react'

// 로그인/비밀번호 재설정 화면이 공유하는 껍데기.
// 배경 연출과 카드 스타일이 로그인 페이지와 어긋나면 재설정 도중에
// 다른 서비스로 넘어온 느낌이 나서, 같은 값을 한 곳에서 쓰도록 뺐다.
export const authInputStyle: CSSProperties = {
  width: '100%', background: '#FFFFFF', border: '1px solid rgba(36,28,21,0.12)',
  borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#241C15',
  outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
}

export function authSubmitStyle(loading: boolean): CSSProperties {
  return {
    width: '100%', padding: '15px', borderRadius: 16, border: 'none',
    background: 'linear-gradient(135deg, #D84A1E 0%, #FF6F3C 100%)',
    color: 'white', fontSize: 16, fontWeight: 700,
    cursor: loading ? 'default' : 'pointer',
    boxShadow: '0 4px 20px rgba(216,74,30,0.3)',
    marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
  }
}

export function AuthShell({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden', position: 'relative' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: 1000, height: 800,
          background: 'radial-gradient(ellipse at center top, rgba(255,111,60,0.16) 0%, rgba(216,74,30,0.06) 35%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-15%', width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(255,111,60,0.08) 0%, transparent 55%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(216,74,30,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(216,74,30,0.02) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: 18 }}>
            <div style={{
              position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
              width: 140, height: 70,
              background: 'radial-gradient(ellipse at top, rgba(255,111,60,0.35) 0%, transparent 70%)',
              filter: 'blur(10px)', zIndex: 0,
            }} />
            <div style={{
              width: 72, height: 72, borderRadius: 26,
              background: 'linear-gradient(145deg, #FFEDE0, #FFD9BC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,111,60,0.25), 0 8px 32px rgba(216,74,30,0.2), 0 0 60px rgba(255,111,60,0.12)',
              position: 'relative', zIndex: 1,
            }}>
              <svg width="52" height="52" viewBox="0 0 100 100">
                <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#FF6F3C" />
                <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="#FF6F3C" />
                <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(216,74,30,0.8)" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.2, color: '#241C15', margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'rgba(36,28,21,0.55)', fontWeight: 500, marginTop: 10 }}>{subtitle}</p>
          )}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.78)', borderRadius: 28, padding: '32px 28px',
          border: '1px solid rgba(36,28,21,0.08)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(255,111,60,0.08), 0 40px 80px rgba(36,28,21,0.12)',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        .kpick-input::placeholder { color: rgba(36,28,21,0.32); }
        .kpick-input:focus {
          border-color: rgba(255,111,60,0.45) !important;
          background: rgba(255,111,60,0.04) !important;
          box-shadow: 0 0 0 3px rgba(255,111,60,0.1);
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(216,74,30,0.35) !important;
        }
        .submit-btn:not(:disabled):active { transform: scale(0.98); }
      `}</style>
    </div>
  )
}
