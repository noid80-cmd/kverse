import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
          position: 'relative',
        }}
      >
        {/* shine overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '55%',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
          display: 'flex',
        }} />

        {/* 마이크 body */}
        <div style={{
          position: 'absolute',
          top: 28, left: 62,
          width: 56, height: 78,
          background: 'white',
          borderRadius: 28,
          display: 'flex',
        }} />

        {/* U-bracket */}
        <div style={{
          position: 'absolute',
          top: 90, left: 34,
          width: 112, height: 52,
          border: '8px solid white',
          borderTop: 'none',
          borderRadius: '0 0 64px 64px',
          background: 'transparent',
          display: 'flex',
        }} />

        {/* stand */}
        <div style={{
          position: 'absolute',
          top: 140, left: 86,
          width: 8, height: 22,
          background: 'white',
          borderRadius: 4,
          display: 'flex',
        }} />

        {/* base */}
        <div style={{
          position: 'absolute',
          top: 160, left: 54,
          width: 72, height: 8,
          background: 'white',
          borderRadius: 4,
          display: 'flex',
        }} />
      </div>
    ),
    { ...size }
  )
}
