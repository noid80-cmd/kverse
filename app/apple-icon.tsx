import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: '#080808',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '22%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E91E8C 0%, #7B2FBE 100%)',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 72,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1,
          }}
        >
          K
        </span>
      </div>
    </div>,
    { ...size }
  )
}
