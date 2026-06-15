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
        {/* glow layer 1 - wide */}
        <div style={{ position: 'absolute', display: 'flex', filter: 'blur(14px)' }}>
          <span style={{ color: '#06b6d4', fontSize: 110, lineHeight: 1 }}>✦</span>
        </div>
        {/* glow layer 2 - tight */}
        <div style={{ position: 'absolute', display: 'flex', filter: 'blur(5px)' }}>
          <span style={{ color: '#22d3ee', fontSize: 110, lineHeight: 1 }}>✦</span>
        </div>
        {/* main star */}
        <span style={{ color: '#cffafe', fontSize: 110, lineHeight: 1 }}>✦</span>

        {/* small sparkle top-right */}
        <div style={{ position: 'absolute', top: 22, right: 24, display: 'flex', filter: 'blur(2px)' }}>
          <span style={{ color: '#06b6d4', fontSize: 26, lineHeight: 1 }}>✦</span>
        </div>
        <span style={{ position: 'absolute', top: 22, right: 24, color: '#a5f3fc', fontSize: 26, lineHeight: 1 }}>✦</span>

        {/* tiny sparkle bottom-left */}
        <div style={{ position: 'absolute', bottom: 28, left: 22, display: 'flex', filter: 'blur(1.5px)' }}>
          <span style={{ color: '#06b6d4', fontSize: 16, lineHeight: 1 }}>✦</span>
        </div>
        <span style={{ position: 'absolute', bottom: 28, left: 22, color: '#a5f3fc', fontSize: 16, lineHeight: 1 }}>✦</span>
      </div>
    ),
    { ...size }
  )
}
