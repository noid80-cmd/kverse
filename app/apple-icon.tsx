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
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="90" cy="90" rx="82" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rg)" strokeWidth="8" fill="none"
          clipPath="url(#top)" opacity="0.4"
        />

        {/* K — vertical bar */}
        <rect x="26" y="22" width="38" height="136" rx="7"
          fill="#E91E8C" filter="url(#glow)" />

        {/* K — upper arm */}
        <line x1="53" y1="85" x2="157" y2="22"
          stroke="#E91E8C" strokeWidth="33"
          strokeLinecap="round" filter="url(#glow)" />

        {/* K — lower arm */}
        <line x1="53" y1="95" x2="157" y2="158"
          stroke="#E91E8C" strokeWidth="33"
          strokeLinecap="round" filter="url(#glow)" />

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
