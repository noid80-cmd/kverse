import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
        position: 'relative',
      }}>
        {/* vertical bar */}
        <div style={{
          position: 'absolute',
          width: 22, height: 110,
          borderRadius: 11,
          background: '#06b6d4',
        }} />
        {/* horizontal bar */}
        <div style={{
          position: 'absolute',
          width: 110, height: 22,
          borderRadius: 11,
          background: '#06b6d4',
        }} />
      </div>
    ),
    { ...size }
  )
}
