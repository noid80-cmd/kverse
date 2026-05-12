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
        position: 'relative',
      }}
    >
      <svg width={512} height={512} viewBox="0 0 512 512">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="top"><rect x="0" y="0" width="512" height="256" /></clipPath>
          <clipPath id="bot"><rect x="0" y="256" width="512" height="256" /></clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="256" cy="256" rx="230" ry="56"
          transform="rotate(-18 256 256)"
          stroke="url(#rg)" strokeWidth="22" fill="none"
          clipPath="url(#top)" opacity="0.38"
        />

        {/* K — fill + thick stroke for bold look */}
        <text
          x="256" y="256"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="380"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, Arial Black, sans-serif"
          fill="#E91E8C"
          stroke="#E91E8C"
          strokeWidth="14"
          strokeLinejoin="round"
          filter="url(#glow)"
        >K</text>

        {/* Front arc */}
        <ellipse cx="256" cy="256" rx="230" ry="56"
          transform="rotate(-18 256 256)"
          stroke="url(#rg)" strokeWidth="22" fill="none"
          clipPath="url(#bot)"
        />
      </svg>
    </div>,
    { ...size }
  )
}
