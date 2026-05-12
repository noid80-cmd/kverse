import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// K as a single filled polygon — clean joints, no bleed
// Vertical bar: 90px wide. Arms: 90px thick at tip.
const K = 'M 80,65 L 170,65 L 170,205 L 395,65 L 432,65 L 432,155 L 232,256 L 432,357 L 432,447 L 395,447 L 170,307 L 170,447 L 80,447 Z'

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
          <filter id="glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Back arc */}
        <ellipse cx="256" cy="256" rx="232" ry="58"
          transform="rotate(-18 256 256)"
          stroke="url(#rg)" strokeWidth="22" fill="none"
          clipPath="url(#top)" opacity="0.4"
        />

        {/* K */}
        <path d={K} fill="#E91E8C" filter="url(#glow)" />

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
