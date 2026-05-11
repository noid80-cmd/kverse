import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#080808',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '24%',
      }}
    >
      {/* gradient planet circle */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E91E8C 0%, #7B2FBE 100%)',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 160,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1,
            letterSpacing: '-6px',
          }}
        >
          K
        </span>
      </div>
      {/* ring arc — wide ellipse in front */}
      <div
        style={{
          position: 'absolute',
          bottom: 110,
          left: 60,
          right: 60,
          height: 36,
          borderRadius: '50%',
          border: '14px solid transparent',
          borderBottom: '14px solid #E91E8C',
          transform: 'rotate(-20deg)',
        }}
      />
    </div>,
    { ...size }
  )
}
