import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          K
        </span>
      </div>
    ),
    { ...size }
  )
}
