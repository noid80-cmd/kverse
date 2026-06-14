export default function IconPreviewPage() {
  const grad = 'linear-gradient(135deg, #0891b2, #06b6d4)'

  const icons = [
    {
      label: '① 마이크',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g1)"/>
          <rect x="51" y="18" width="38" height="62" rx="19" fill="white"/>
          <path d="M 26,68 A 44,38 0 0,0 114,68" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/>
          <rect x="67" y="106" width="6" height="16" rx="3" fill="white"/>
          <rect x="49" y="119" width="42" height="6" rx="3" fill="white"/>
        </svg>
      ),
    },
    {
      label: '② 음표',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g2)"/>
          {/* note head */}
          <ellipse cx="50" cy="102" rx="22" ry="15" transform="rotate(-20 50 102)" fill="white"/>
          {/* stem */}
          <rect x="68" y="22" width="7" height="82" rx="3.5" fill="white"/>
          {/* beam */}
          <path d="M 75,22 Q 118,36 118,72" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: '③ 크라운',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g3)"/>
          {/* crown body */}
          <path d="M 18,108 L 18,68 L 42,86 L 70,36 L 98,86 L 122,68 L 122,108 Z" fill="white"/>
          {/* base bar */}
          <rect x="18" y="106" width="104" height="14" rx="4" fill="white"/>
          {/* jewel dots */}
          <circle cx="70" cy="40" r="7" fill="#22d3ee"/>
          <circle cx="42" cy="90" r="5" fill="#22d3ee"/>
          <circle cx="98" cy="90" r="5" fill="#22d3ee"/>
        </svg>
      ),
    },
    {
      label: '④ 스포트라이트',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
            <linearGradient id="beam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.92)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.18)"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g4)"/>
          {/* 조명 본체 */}
          <rect x="44" y="12" width="52" height="22" rx="9" fill="white"/>
          {/* 빔 - 더 넓게 */}
          <path d="M 50,34 L 10,128 L 130,128 L 90,34 Z" fill="url(#beam)"/>
          {/* 사람 - 머리 + 몸통 붙임 */}
          <circle cx="70" cy="86" r="14" fill="rgba(5,80,105,0.9)"/>
          <path d="M 44,128 Q 44,100 70,100 Q 96,100 96,128" fill="rgba(5,80,105,0.9)"/>
        </svg>
      ),
    },
    {
      label: '⑤ 별 + K',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g5)"/>
          {/* star */}
          <path d="M70,18 L79,50 L114,50 L86,70 L97,102 L70,82 L43,102 L54,70 L26,50 L61,50 Z" fill="white" opacity="0.22"/>
          {/* K */}
          <text x="70" y="96" fontFamily="Arial Black, sans-serif" fontSize="72" fontWeight="900" fill="white" textAnchor="middle">K</text>
        </svg>
      ),
    },
    {
      label: '⑥ 카메라',
      svg: (
        <svg viewBox="0 0 140 140" width="140" height="140">
          <defs>
            <linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <rect width="140" height="140" rx="32" fill="url(#g6)"/>
          {/* shutter bump */}
          <rect x="48" y="32" width="28" height="14" rx="7" fill="white"/>
          {/* camera body */}
          <rect x="14" y="44" width="112" height="72" rx="14" fill="white"/>
          {/* lens outer ring */}
          <circle cx="62" cy="80" r="26" fill="#0891b2"/>
          {/* lens inner */}
          <circle cx="62" cy="80" r="16" fill="#06b6d4"/>
          <circle cx="62" cy="80" r="7" fill="white"/>
          {/* rec dot */}
          <circle cx="106" cy="60" r="7" fill="#f43f5e"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', padding: '40px 20px 60px' }}>
      <h1 style={{ color: '#eeeeff', fontSize: 20, fontWeight: 900, marginBottom: 6, textAlign: 'center' }}>아이콘 디자인 옵션</h1>
      <p style={{ color: '#555570', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>마음에 드는 번호를 알려주세요</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 360, margin: '0 auto' }}>
        {icons.map(icon => (
          <div key={icon.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 32, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              {icon.svg}
            </div>
            <span style={{ fontSize: 13, color: '#8888aa', fontWeight: 600, textAlign: 'center' }}>{icon.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
