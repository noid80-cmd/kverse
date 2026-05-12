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
      {/* Back arc – top half, faded (behind K) */}
      <svg
        width={180}
        height={180}
        viewBox="0 0 180 180"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="top180">
            <rect x="0" y="0" width="180" height="90" />
          </clipPath>
        </defs>
        <ellipse
          cx="90" cy="90" rx="81" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rb)" strokeWidth="8" fill="none"
          clipPath="url(#top180)" opacity="0.38"
        />
      </svg>

      {/* K letter */}
      <span
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: '#E91E8C',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
          textShadow: '0 0 16px rgba(233,30,140,0.6), 0 0 32px rgba(233,30,140,0.3)',
        }}
      >
        K
      </span>

      {/* Front arc – bottom half, full opacity (in front of K) */}
      <svg
        width={180}
        height={180}
        viewBox="0 0 180 180"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
      >
        <defs>
          <linearGradient id="rf" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          <clipPath id="bot180">
            <rect x="0" y="90" width="180" height="90" />
          </clipPath>
        </defs>
        <ellipse
          cx="90" cy="90" rx="81" ry="20"
          transform="rotate(-18 90 90)"
          stroke="url(#rf)" strokeWidth="8" fill="none"
          clipPath="url(#bot180)"
        />
      </svg>
    </div>,
    { ...size }
  )
}
