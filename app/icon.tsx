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
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="256" cy="256" rx="232" ry="58"
          transform="rotate(-18 256 256)"
          stroke="url(#rg)" strokeWidth="22" fill="none"
          clipPath="url(#top)" opacity="0.4"
        />

        {/* K — vertical bar */}
        <rect x="74" y="62" width="110" height="388" rx="20"
          fill="#E91E8C" filter="url(#glow)" />

        {/* K — upper arm */}
        <line x1="152" y1="242" x2="448" y2="64"
          stroke="#E91E8C" strokeWidth="95"
          strokeLinecap="round" filter="url(#glow)" />

        {/* K — lower arm */}
        <line x1="152" y1="270" x2="448" y2="448"
          stroke="#E91E8C" strokeWidth="95"
          strokeLinecap="round" filter="url(#glow)" />

        {/* Front arc */}
        <ellipse cx="256" cy="256" rx="232" ry="58"
          transform="rotate(-18 256 256)"
          stroke="url(#rg)" strokeWidth="22" fill="none"
          clipPath="url(#bot)"
        />
      </svg>
    </div>,
    { ...size }
  )
}
