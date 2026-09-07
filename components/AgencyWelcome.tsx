'use client'

import { useEffect, useState } from 'react'
import { Bell, KeyRound, Share } from 'lucide-react'
import { isNativeApp } from '@/lib/capacitor'

// 초대 링크로 막 들어온 기획사에게 딱 두 가지를 시킨다.
//
// 캐스팅 담당자는 돌아다니면서 폰으로 틈틈이 본다. 그 말은 알림이 와야
// 본다는 뜻이고, 알림이 이 서비스의 생명선이라는 뜻이다. 그런데 아이폰
// 사파리 탭에는 웹 알림이 아예 없다 — 앱을 깔거나 홈 화면에 추가해야
// 비로소 알림이 간다. 그래서 첫 화면에서 그걸 먼저 시킨다.
//
// 두 번째는 비밀번호다. 초대로 들어온 계정에는 비밀번호가 없어서, 세션이
// 끊기면 다시 못 들어온다.

const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6791017827'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.kpick.twa'

type Platform = 'ios-app' | 'ios-web' | 'android' | 'desktop'

function detect(): Platform {
  if (typeof window === 'undefined') return 'desktop'
  if (isNativeApp()) return 'ios-app'
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  const isIos = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIos) {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true
    return standalone ? 'ios-app' : 'ios-web'
  }
  return 'desktop'
}

export default function AgencyWelcome({ onDismiss }: { onDismiss: () => void }) {
  const [platform, setPlatform] = useState<Platform>('desktop')
  useEffect(() => { setPlatform(detect()) }, [])

  const alreadyGetsPush = platform === 'ios-app'

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 18, overflow: 'hidden',
      border: '1px solid rgba(255,111,60,0.28)', marginBottom: 16,
    }}>
      <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg, rgba(255,111,60,0.1), rgba(255,111,60,0.03))' }}>
        <div style={{ fontSize: 15.5, fontWeight: 900, color: '#241C15', marginBottom: 4 }}>시작 준비가 끝났어요</div>
        <div style={{ fontSize: 12.5, color: '#8A4B2E', lineHeight: 1.6 }}>
          두 가지만 해두시면 다음부터 편합니다.
        </div>
      </div>

      <div style={{ padding: '4px 18px 16px' }}>
        {/* 1. 알림 */}
        <div style={{ display: 'flex', gap: 11, padding: '14px 0', borderBottom: '1px solid rgba(36,28,21,0.07)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0, marginTop: 1,
            background: 'rgba(255,111,60,0.12)', color: '#D84A1E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Bell size={16} strokeWidth={2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#241C15', marginBottom: 3 }}>
              지원자 알림 받기
            </div>
            <div style={{ fontSize: 12.5, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 10 }}>
              {alreadyGetsPush
                ? '알림을 받을 수 있는 상태예요. 설정에서 켜두시면 새 지원자가 올 때 바로 알려드려요.'
                : platform === 'ios-web'
                ? '지금 화면(사파리 탭)에는 알림이 오지 않아요. 앱을 받으시거나 홈 화면에 추가해주세요.'
                : platform === 'android'
                ? '앱을 받으시면 새 지원자가 올 때 바로 알려드려요.'
                : '폰에서 받아두시면 이동 중에도 새 지원자를 놓치지 않아요.'}
            </div>

            {platform !== 'ios-app' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {platform !== 'android' && (
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={btn}>iPhone 앱 받기</a>
                )}
                {platform !== 'ios-web' && (
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={btn}>Android 앱 받기</a>
                )}
              </div>
            )}

            {platform === 'ios-web' && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(36,28,21,0.04)', fontSize: 12, color: '#6B6355', lineHeight: 1.7,
              }}>
                <b style={{ color: '#241C15' }}>앱 없이 쓰시려면</b><br />
                사파리 아래 <Share size={12} style={{ display: 'inline', verticalAlign: -1 }} /> 버튼 →{' '}
                <b>홈 화면에 추가</b> 를 누르면 아이콘으로 열리고 알림도 옵니다.
                <div style={{ marginTop: 6, color: '#A69C8E' }}>
                  카카오톡 안에서 열렸다면 먼저 [사파리로 열기]로 나가주세요.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. 비밀번호 */}
        <div style={{ display: 'flex', gap: 11, padding: '14px 0 4px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0, marginTop: 1,
            background: 'rgba(255,111,60,0.12)', color: '#D84A1E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><KeyRound size={16} strokeWidth={2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#241C15', marginBottom: 3 }}>
              비밀번호 정하기
            </div>
            <div style={{ fontSize: 12.5, color: '#8A7F6E', lineHeight: 1.6, marginBottom: 10 }}>
              초대 링크로 들어오신 상태라 아직 비밀번호가 없어요.
              한 번 정해두시면 다른 기기에서도 바로 로그인하실 수 있어요.
            </div>
            <a href="/account/password" style={{ ...btn, background: 'linear-gradient(135deg, #D84A1E, #FF6F3C)', color: 'white', border: 'none' }}>
              비밀번호 정하기
            </a>
          </div>
        </div>

        <button onClick={onDismiss} style={{
          display: 'block', width: '100%', marginTop: 12, padding: '10px',
          background: 'none', border: 'none', fontSize: 12.5, color: '#A69C8E',
          fontWeight: 600, cursor: 'pointer',
        }}>
          나중에 하기
        </button>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  display: 'inline-block', padding: '9px 14px', borderRadius: 11,
  border: '1px solid rgba(36,28,21,0.14)', background: '#FFFFFF',
  color: '#241C15', fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
}
