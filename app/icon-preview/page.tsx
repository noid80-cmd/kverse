'use client'

export default function IconPreview() {
  const icons = [
    {
      label: '① K 레터',
      bg: 'linear-gradient(145deg, #7c3aed, #ec4899)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ color: 'white', fontSize: 90, fontWeight: 900, letterSpacing: -4, lineHeight: 1, fontFamily: 'Arial Black, sans-serif' }}>K</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: 700, letterSpacing: 6 }}>pick</span>
        </div>
      ),
    },
    {
      label: '② 별/스파클',
      bg: 'linear-gradient(145deg, #0f0a1e, #2d1b69)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="90" height="90" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#facc15" />
          </svg>
          <span style={{ color: 'rgba(250,204,21,0.85)', fontSize: 20, fontWeight: 800, letterSpacing: 5 }}>KPICK</span>
        </div>
      ),
    },
    {
      label: '③ 카메라+필름',
      bg: 'linear-gradient(145deg, #0c0a00, #78350f)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="90" height="80" viewBox="0 0 80 70">
            <rect x="4" y="20" width="72" height="46" rx="10" fill="white" fillOpacity="0.9" />
            <circle cx="40" cy="43" r="18" fill="#78350f" />
            <circle cx="40" cy="43" r="12" fill="#0c0a00" />
            <circle cx="40" cy="43" r="5" fill="white" fillOpacity="0.3" />
            <rect x="26" y="10" width="28" height="14" rx="6" fill="white" fillOpacity="0.9" />
            <circle cx="64" cy="29" r="5" fill="#ef4444" />
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>KPICK</span>
        </div>
      ),
    },
    {
      label: '④ 왕관/크라운',
      bg: 'linear-gradient(145deg, #1e1b4b, #4c1d95)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <svg width="100" height="76" viewBox="0 0 100 76">
            <path d="M10 65 L10 45 L25 20 L50 45 L75 20 L90 45 L90 65 Z" fill="#facc15" />
            <circle cx="25" cy="20" r="7" fill="#f472b6" />
            <circle cx="50" cy="10" r="9" fill="#f472b6" />
            <circle cx="75" cy="20" r="7" fill="#f472b6" />
            <rect x="10" y="57" width="80" height="10" rx="4" fill="#eab308" />
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 22, fontWeight: 900, letterSpacing: 4 }}>KPICK</span>
        </div>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 40 }}>
      <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>Kpick 아이콘 비교</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {icons.map(({ label, bg, content }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 180, height: 180, borderRadius: 40,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
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
