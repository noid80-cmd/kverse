import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #001a20, #0a3d4a)',
        position: 'relative',
      }}>

        {/* ── wide glow layer ── */}
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(18px)', opacity: 0.85 }}>
          <div style={{ position: 'relative', width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 21, height: 108, borderRadius: 11, background: 'linear-gradient(to bottom, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 108, height: 21, borderRadius: 11, background: 'linear-gradient(to right, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
          </div>
        </div>

        {/* ── mid glow layer ── */}
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(7px)', opacity: 0.95 }}>
          <div style={{ position: 'relative', width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 21, height: 108, borderRadius: 11, background: 'linear-gradient(to bottom, transparent, #22d3ee 28%, #22d3ee 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 108, height: 21, borderRadius: 11, background: 'linear-gradient(to right, transparent, #22d3ee 28%, #22d3ee 72%, transparent)' }} />
          </div>
        </div>

        {/* ── sharp star ── */}
        <div style={{ position: 'relative', width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 21, height: 108, borderRadius: 11, background: 'linear-gradient(to bottom, transparent, #cffafe 28%, #cffafe 72%, transparent)' }} />
          <div style={{ position: 'absolute', width: 108, height: 21, borderRadius: 11, background: 'linear-gradient(to right, transparent, #cffafe 28%, #cffafe 72%, transparent)' }} />
        </div>

        {/* ── small sparkle top-right glow ── */}
        <div style={{ position: 'absolute', top: 18, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(3px)' }}>
          <div style={{ position: 'relative', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 6, height: 28, borderRadius: 3, background: 'linear-gradient(to bottom, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 28, height: 6, borderRadius: 3, background: 'linear-gradient(to right, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
          </div>
        </div>
        {/* ── small sparkle top-right sharp ── */}
        <div style={{ position: 'absolute', top: 18, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 6, height: 28, borderRadius: 3, background: 'linear-gradient(to bottom, transparent, #a5f3fc 28%, #a5f3fc 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 28, height: 6, borderRadius: 3, background: 'linear-gradient(to right, transparent, #a5f3fc 28%, #a5f3fc 72%, transparent)' }} />
          </div>
        </div>

        {/* ── tiny sparkle bottom-left glow ── */}
        <div style={{ position: 'absolute', bottom: 24, left: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(2px)' }}>
          <div style={{ position: 'relative', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(to bottom, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 18, height: 4, borderRadius: 2, background: 'linear-gradient(to right, transparent, #06b6d4 28%, #06b6d4 72%, transparent)' }} />
          </div>
        </div>
        {/* ── tiny sparkle bottom-left sharp ── */}
        <div style={{ position: 'absolute', bottom: 24, left: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(to bottom, transparent, #a5f3fc 28%, #a5f3fc 72%, transparent)' }} />
            <div style={{ position: 'absolute', width: 18, height: 4, borderRadius: 2, background: 'linear-gradient(to right, transparent, #a5f3fc 28%, #a5f3fc 72%, transparent)' }} />
          </div>
        </div>

      </div>
    ),
    { ...size }
  )
}
