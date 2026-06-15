'use client'

export default function IconPreview() {
  const icons = [
    {
      label: '① ✦ 심볼 (수정)',
      bg: 'linear-gradient(145deg, #1a0533, #7c1fa8)',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="130" height="130" viewBox="0 0 100 100">
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowSm" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* main star */}
            <path d="M50 4 L57 43 L96 50 L57 57 L50 96 L43 57 L4 50 L43 43 Z" fill="#f9a8d4" filter="url(#glow)" />
            {/* small sparkles */}
            <path d="M82 18 L84 26 L92 28 L84 30 L82 38 L80 30 L72 28 L80 26 Z" fill="rgba(249,168,212,0.75)" filter="url(#glowSm)" />
            <path d="M16 70 L17 74 L21 75 L17 76 L16 80 L15 76 L11 75 L15 74 Z" fill="rgba(249,168,212,0.6)" filter="url(#glowSm)" />
          </svg>
        </div>
      ),
    },
    {
      label: '② 네온 K (콘서트)',
      bg: '#06000f',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative' }}>
          {/* outer glow */}
          <span style={{
            position: 'absolute',
            color: 'transparent',
            fontSize: 110, fontWeight: 900, lineHeight: 1,
            textShadow: '0 0 30px #39ff14, 0 0 60px #39ff14, 0 0 100px #39ff14',
            fontFamily: 'Arial Black, sans-serif',
            userSelect: 'none',
          }}>K</span>
          <span style={{
            color: '#39ff14',
            fontSize: 110, fontWeight: 900, lineHeight: 1,
            textShadow: '0 0 8px #39ff14, 0 0 20px #39ff14',
            fontFamily: 'Arial Black, sans-serif',
          }}>K</span>
          <span style={{ color: 'rgba(57,255,20,0.7)', fontSize: 16, fontWeight: 700, letterSpacing: 7, marginTop: -6 }}>PICK</span>
        </div>
      ),
    },
    {
      label: '③ 하트+K (팬덤)',
      bg: 'linear-gradient(145deg, #1a0020, #8b0040)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ position: 'relative', width: 110, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="110" height="100" viewBox="0 0 110 100" style={{ position: 'absolute' }}>
              <path d="M55 88 C55 88 8 58 8 30 C8 14 20 4 36 4 C45 4 52 9 55 14 C58 9 65 4 74 4 C90 4 102 14 102 30 C102 58 55 88 55 88 Z" fill="#f472b6" />
            </svg>
            <span style={{
              position: 'relative', zIndex: 1,
              color: 'white', fontSize: 62, fontWeight: 900, lineHeight: 1,
              fontFamily: 'Arial Black, sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              marginTop: -8,
            }}>K</span>
          </div>
          <span style={{ color: 'rgba(244,114,182,0.85)', fontSize: 18, fontWeight: 800, letterSpacing: 5 }}>PICK</span>
        </div>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 40 }}>
      <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>Kpick 아이콘 2차</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {icons.map(({ label, bg, content }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 180, height: 180, borderRadius: 40,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              {content}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
