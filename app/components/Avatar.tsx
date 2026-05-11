'use client'

export type EquippedItems = {
  outfit?: { outfitColor?: string; type?: string }
  hat?: { hatColor?: string; style?: string; hatEmoji?: string }
  accessory?: { type?: string; color?: string; emoji?: string }
  glowstick?: { glowColor?: string; shape?: string; emoji?: string }
  skin?: { auraColor?: string; gradient?: string }
}

type AvatarProps = {
  gender: 'male' | 'female'
  equipped?: EquippedItems
  groupColor?: string
  size?: number
  rpmAvatarUrl?: string | null
  username?: string
}

export default function Avatar({ equipped, groupColor, size = 160, rpmAvatarUrl, username }: AvatarProps) {
  if (rpmAvatarUrl) {
    const base = rpmAvatarUrl.replace(/\.glb$/, '')
    const pngUrl = `${base}.png?scene=fullbody-portrait-v1-transparent&arm=5`
    return <img src={pngUrl} alt="avatar" width={size} height={size} style={{ objectFit: 'cover', borderRadius: 16 }} />
  }

  const color     = groupColor || '#7C3AED'
  const aura      = equipped?.skin?.auraColor || color
  const hasAura   = !!equipped?.skin?.auraColor
  const glowColor = equipped?.glowstick?.glowColor || color
  const initial   = ((username || '?')[0]).toUpperCase()

  const badges = [
    equipped?.hat?.hatEmoji,
    equipped?.glowstick?.emoji,
    equipped?.accessory?.emoji,
  ].filter(Boolean) as string[]

  const uid   = `av${(username || 'u').replace(/\W/g, '')}`
  const lite  = hexLighten(color, 0.5)
  const mid   = hexLighten(color, 0.15)
  const dark  = hexDarken(color, 0.55)
  const vdark = hexDarken(color, 0.72)

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* dark card bg with color tint */}
          <radialGradient id={`bg${uid}`} cx="50%" cy="38%" r="75%">
            <stop offset="0%"   stopColor={mid}   />
            <stop offset="60%"  stopColor={dark}  />
            <stop offset="100%" stopColor={vdark} />
          </radialGradient>
          {/* center circle fill */}
          <radialGradient id={`cc${uid}`} cx="35%" cy="28%" r="80%">
            <stop offset="0%"   stopColor={lite} />
            <stop offset="55%"  stopColor={color} />
            <stop offset="100%" stopColor={dark}  />
          </radialGradient>
          {/* shimmer */}
          <linearGradient id={`sh${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="white" stopOpacity="0" />
            <stop offset="42%"  stopColor="white" stopOpacity="0.07" />
            <stop offset="50%"  stopColor="white" stopOpacity="0.18" />
            <stop offset="58%"  stopColor="white" stopOpacity="0.07" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          {/* blur for glow rings */}
          <filter id={`gf${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={`lf${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          <clipPath id={`cp${uid}`}>
            <rect x="0" y="0" width="100" height="100" rx="18" />
          </clipPath>
        </defs>

        {/* ── card background ── */}
        <rect x="0" y="0" width="100" height="100" rx="18" fill={`url(#bg${uid})`} />
        {/* shimmer overlay */}
        <rect x="0" y="0" width="100" height="100" rx="18" fill={`url(#sh${uid})`} />

        {/* ── outer glow ring (animated) ── */}
        <circle cx="50" cy="44" r="32" fill="none" stroke={color} strokeWidth="6" opacity="0.18" filter={`url(#gf${uid})`}>
          <animate attributeName="opacity" values="0.12;0.28;0.12" dur="3s" repeatCount="indefinite" />
          <animate attributeName="r" values="30;34;30" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* ── center badge circle ── */}
        {/* glow shadow */}
        <circle cx="50" cy="44" r="24" fill={color} opacity="0.35" filter={`url(#gf${uid})`} />
        {/* main circle */}
        <circle cx="50" cy="44" r="22" fill={`url(#cc${uid})`} />
        {/* inner highlight arc */}
        <path d="M34,34 Q50,26 66,34" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
        {/* thin ring border */}
        <circle cx="50" cy="44" r="22" fill="none" stroke="white" strokeWidth="0.7" opacity="0.25" />

        {/* ── initial letter ── */}
        {/* glow layer */}
        <text x="50" y="56" textAnchor="middle"
          fontSize="30" fontWeight="900"
          fontFamily="system-ui,-apple-system,'Helvetica Neue',sans-serif"
          fill={lite} opacity="0.5" filter={`url(#lf${uid})`}>
          {initial}
        </text>
        {/* main letter */}
        <text x="50" y="56" textAnchor="middle"
          fontSize="30" fontWeight="900"
          fontFamily="system-ui,-apple-system,'Helvetica Neue',sans-serif"
          fill="white" opacity="0.97">
          {initial}
        </text>

        {/* ── decorative stars ── */}
        <text x="14" y="20" fontSize="6.5" fill="white" opacity="0.5" fontFamily="serif">✦
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.4s" repeatCount="indefinite" />
        </text>
        <text x="79" y="16" fontSize="4.5" fill="white" fontFamily="serif">✦
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3.1s" repeatCount="indefinite" />
        </text>
        <text x="83" y="72" fontSize="5.5" fill="white" fontFamily="serif">✦
          <animate attributeName="opacity" values="0.25;0.55;0.25" dur="2.7s" repeatCount="indefinite" />
        </text>
        <text x="9" y="76" fontSize="4" fill="white" fontFamily="serif">✦
          <animate attributeName="opacity" values="0.15;0.45;0.15" dur="3.5s" repeatCount="indefinite" />
        </text>
        <text x="87" y="44" fontSize="3" fill={lite} fontFamily="serif">✦
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="4s" repeatCount="indefinite" />
        </text>

        {/* ── username strip ── */}
        <rect x="10" y="73" width="80" height="15" rx="7.5" fill="black" opacity="0.3" />
        <text x="50" y="83.5" textAnchor="middle"
          fontSize="8" fontWeight="700"
          fontFamily="system-ui,-apple-system,sans-serif"
          fill="white" opacity="0.85" letterSpacing="0.3">
          {username ? `@${username.slice(0, 10)}` : ''}
        </text>

        {/* ── card border ── */}
        <rect x="1" y="1" width="98" height="98" rx="17"
          fill="none" stroke={lite} strokeWidth="1" opacity="0.2" />
        {/* top-left corner accent */}
        <path d="M1,18 L1,1 L18,1" fill="none" stroke={lite} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        {/* bottom-right corner accent */}
        <path d="M99,82 L99,99 L82,99" fill="none" stroke={lite} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>

      {/* ── equipped item badges ── */}
      {badges[0] && (
        <span style={{
          position: 'absolute', top: -size * 0.1, right: -size * 0.08,
          fontSize: size * 0.24, lineHeight: 1,
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
          pointerEvents: 'none',
        }}>{badges[0]}</span>
      )}
      {badges[1] && (
        <span style={{
          position: 'absolute', bottom: size * 0.02, right: -size * 0.12,
          fontSize: size * 0.22, lineHeight: 1,
          filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor}88)`,
          pointerEvents: 'none',
        }}>{badges[1]}</span>
      )}
      {badges[2] && (
        <span style={{
          position: 'absolute', bottom: size * 0.02, left: -size * 0.1,
          fontSize: size * 0.2, lineHeight: 1,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          pointerEvents: 'none',
        }}>{badges[2]}</span>
      )}

      {/* ── aura sparkles ── */}
      {hasAura && (<>
        <span style={{ position:'absolute', top:'6%',   left:'-5%',  width:7, height:7, borderRadius:'50%', background:aura, opacity:0.8, pointerEvents:'none' }} />
        <span style={{ position:'absolute', top:'28%',  right:'-6%', width:5, height:5, borderRadius:'50%', background:aura, opacity:0.6, pointerEvents:'none' }} />
        <span style={{ position:'absolute', bottom:'14%', left:'-6%', width:6, height:6, borderRadius:'50%', background:aura, opacity:0.7, pointerEvents:'none' }} />
        <span style={{ position:'absolute', bottom:'26%', right:'-5%', width:4, height:4, borderRadius:'50%', background:aura, opacity:0.5, pointerEvents:'none' }} />
      </>)}
    </div>
  )
}

function hexLighten(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amt))},${Math.min(255, Math.round(g + (255 - g) * amt))},${Math.min(255, Math.round(b + (255 - b) * amt))})`
}
function hexDarken(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgb(${Math.max(0, Math.round(r * (1 - amt)))},${Math.max(0, Math.round(g * (1 - amt)))},${Math.max(0, Math.round(b * (1 - amt)))})`
}
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
