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
          background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
          borderRadius: 8,
        }}
      >
        <span
          style={{
            color: '#22d3ee',
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ✦
        </span>
      </div>
    ),
    { ...size }
  )
}
