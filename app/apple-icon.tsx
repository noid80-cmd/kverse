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
        position: 'relative',
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
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="90" cy="90" rx="81" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rg)" strokeWidth="8" fill="none"
          clipPath="url(#top)" opacity="0.38"
        />

        {/* K */}
        <text
          x="90" y="90"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="134"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, Arial Black, sans-serif"
          fill="#E91E8C"
          stroke="#E91E8C"
          strokeWidth="5"
          strokeLinejoin="round"
          filter="url(#glow)"
        >K</text>

        {/* Front arc */}
        <ellipse cx="90" cy="90" rx="81" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rg)" strokeWidth="8" fill="none"
          clipPath="url(#bot)"
        />
      </svg>
    </div>,
    { ...size }
  )
}
