import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const fontData = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-900-normal.woff'
  ).then(r => r.arrayBuffer())

  return new ImageResponse(
    <div
      style={{
        background: '#080808',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg
        width={512} height={512} viewBox="0 0 512 512"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="top512"><rect x="0" y="0" width="512" height="256" /></clipPath>
        </defs>
        <ellipse cx="256" cy="256" rx="230" ry="56"
          transform="rotate(-18 256 256)"
          stroke="url(#rb)" strokeWidth="22" fill="none"
          clipPath="url(#top512)" opacity="0.38"
        />
      </svg>

      <span
        style={{
          fontSize: 360,
          fontWeight: 900,
          color: '#E91E8C',
          fontFamily: 'Inter',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
          textShadow: '0 0 40px rgba(233,30,140,0.5)',
        }}
      >
        K
      </span>

      <svg
        width={512} height={512} viewBox="0 0 512 512"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
      >
        <defs>
          <linearGradient id="rf" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="bot512"><rect x="0" y="256" width="512" height="256" /></clipPath>
        </defs>
        <ellipse cx="256" cy="256" rx="230" ry="56"
          transform="rotate(-18 256 256)"
          stroke="url(#rf)" strokeWidth="22" fill="none"
          clipPath="url(#bot512)"
        />
      </svg>
    </div>,
    {
      ...size,
      fonts: [{ name: 'Inter', data: fontData, weight: 900, style: 'normal' }],
    }
  )
}
