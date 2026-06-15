import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// 4-pointed star using gradient cross bars (tapered ends = star point effect)
function StarShape({ sz, color }: { sz: number; color: string }) {
  const thick = sz * 0.19
  const r = thick / 2
  return (
    <div style={{ position: 'relative', width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', width: thick, height: sz, borderRadius: r,
        background: `linear-gradient(to bottom, transparent, ${color} 28%, ${color} 72%, transparent)`,
      }} />
      <div style={{
        position: 'absolute', width: sz, height: thick, borderRadius: r,
        background: `linear-gradient(to right, transparent, ${color} 28%, ${color} 72%, transparent)`,
      }} />
    </div>
  )
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
        position: 'relative',
      }}>
        {/* wide glow */}
        <div style={{ position: 'absolute', display: 'flex', filter: 'blur(18px)', opacity: 0.9 }}>
          <StarShape sz={108} color="#06b6d4" />
        </div>
        {/* mid glow */}
        <div style={{ position: 'absolute', display: 'flex', filter: 'blur(7px)', opacity: 0.95 }}>
          <StarShape sz={108} color="#22d3ee" />
        </div>
        {/* sharp star */}
        <div style={{ position: 'relative', display: 'flex' }}>
          <StarShape sz={108} color="#cffafe" />
        </div>

        {/* small sparkle — top right */}
        <div style={{ position: 'absolute', top: 20, right: 22, display: 'flex', filter: 'blur(3px)', opacity: 0.85 }}>
          <StarShape sz={28} color="#06b6d4" />
        </div>
        <div style={{ position: 'absolute', top: 20, right: 22, display: 'flex' }}>
          <StarShape sz={28} color="#a5f3fc" />
        </div>

        {/* tiny sparkle — bottom left */}
        <div style={{ position: 'absolute', bottom: 26, left: 20, display: 'flex', filter: 'blur(2px)', opacity: 0.8 }}>
          <StarShape sz={18} color="#06b6d4" />
        </div>
        <div style={{ position: 'absolute', bottom: 26, left: 20, display: 'flex' }}>
          <StarShape sz={18} color="#a5f3fc" />
        </div>
      </div>
    ),
    { ...size }
  )
}
