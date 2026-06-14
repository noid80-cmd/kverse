import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
        position: 'relative',
      }}>
        {/* shine */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '55%',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
          display: 'flex',
        }} />

        {/* 마이크 body */}
        <div style={{
          position: 'absolute', top: 23, left: 65,
          width: 50, height: 80, borderRadius: 25,
          background: 'white', display: 'flex',
        }} />

        {/* U-bracket */}
        <div style={{
          position: 'absolute', top: 87, left: 34,
          width: 112, height: 50,
          border: '9px solid white', borderTop: 'none',
          borderRadius: '0 0 58px 58px',
          background: 'transparent', display: 'flex',
        }} />

        {/* stand */}
        <div style={{
          position: 'absolute', top: 136, left: 85,
          width: 10, height: 21, borderRadius: 5,
          background: 'white', display: 'flex',
        }} />

        {/* base */}
        <div style={{
          position: 'absolute', top: 155, left: 62,
          width: 56, height: 9, borderRadius: 4.5,
          background: 'white', display: 'flex',
        }} />
      </div>
    ),
    { ...size }
  )
}
