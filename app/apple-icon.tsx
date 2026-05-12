import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Same K polygon scaled to 180x180 (factor 0.352)
const K = 'M 28,23 L 60,23 L 60,72 L 139,23 L 152,23 L 152,55 L 82,90 L 152,126 L 152,157 L 139,157 L 60,108 L 60,157 L 28,157 Z'

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
      }}
    >
      <svg width={180} height={180} viewBox="0 0 180 180">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="top"><rect x="0" y="0" width="180" height="90" /></clipPath>
          <clipPath id="bot"><rect x="0" y="90" width="180" height="90" /></clipPath>
          <filter id="glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="90" cy="90" rx="82" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rg)" strokeWidth="8" fill="none"
          clipPath="url(#top)" opacity="0.4"
        />

        {/* K */}
        <path d={K} fill="#E91E8C" filter="url(#glow)" />

        {/* Front arc */}
        <ellipse cx="90" cy="90" rx="82" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rg)" strokeWidth="8" fill="none"
          clipPath="url(#bot)"
        />
      </svg>
    </div>,
    { ...size }
  )
}
