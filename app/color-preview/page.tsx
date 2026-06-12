'use client'

const cyan = {
  glow1: 'rgba(0,212,255,0.22)',
  glow2: 'rgba(0,212,255,0.1)',
  logoGrad: 'linear-gradient(145deg, #0ea5e9 0%, #00d4ff 100%)',
  logoShadow: '0 8px 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2)',
  btnGrad: 'linear-gradient(135deg, #0ea5e9 0%, #00d4ff 100%)',
  btnShadow: '0 4px 28px rgba(0,212,255,0.5)',
  accent: '#00d4ff',
}

const fonts = [
  {
    label: '4. Plus Jakarta Sans',
    desc: '글로벌하고 세련된 느낌',
    font: "'Plus Jakarta Sans', sans-serif",
    titleWeight: 800,
    letterSpacing: -1,
  },
  {
    label: '6. Clash Display',
    desc: '트렌디한 에디토리얼 디스플레이',
    font: "'Clash Display', sans-serif",
    titleWeight: 700,
    letterSpacing: -0.5,
  },
]

function MiniLogin({ font, titleWeight, letterSpacing }: { font: string; titleWeight: number; letterSpacing: number }) {
  return (
    <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', fontFamily: font }}>
      <div style={{ position: 'absolute', inset: 0, background: '#07070d' }}>
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 400,
          background: `radial-gradient(ellipse at center top, ${cyan.glow1} 0%, transparent 65%)`,
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-20%', width: 300, height: 300,
          background: `radial-gradient(circle, ${cyan.glow2} 0%, transparent 60%)`,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 28px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: 16 }}>
            <div style={{
              position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
              width: 100, height: 50,
              background: `radial-gradient(ellipse at top, ${cyan.glow1} 0%, transparent 70%)`,
              filter: 'blur(8px)', zIndex: 0,
            }} />
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: cyan.logoGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 1px rgba(255,255,255,0.1), ${cyan.logoShadow}`,
              position: 'relative', zIndex: 1,
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 55%)' }} />
              <span style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: -1, position: 'relative', fontFamily: font }}>K</span>
            </div>
          </div>
          <div style={{
            fontSize: 36, fontWeight: titleWeight, letterSpacing, lineHeight: 1, marginBottom: 8,
            fontFamily: font,
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Kpick</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontFamily: font }}>
            기획사가 직접 발굴하는 오디션 플랫폼
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: '24px 22px',
          border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 14, marginBottom: 18,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            color: '#eeeeff', fontSize: 14, fontWeight: 600, fontFamily: font,
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z" />
            </svg>
            Google로 로그인
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600, fontFamily: font }}>이메일로 로그인</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: 'rgba(255,255,255,0.2)', fontFamily: font }}>이메일</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: 'rgba(255,255,255,0.2)', fontFamily: font }}>비밀번호</div>
            <div style={{
              padding: '14px', borderRadius: 14, background: cyan.btnGrad,
              color: 'white', fontSize: 15, fontWeight: 700, textAlign: 'center',
              boxShadow: cyan.btnShadow, marginTop: 2, fontFamily: font,
            }}>로그인</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 20, fontFamily: font }}>
          계정이 없으신가요? <span style={{ color: cyan.accent, fontWeight: 700 }}>가입하기</span>
        </div>
      </div>
    </div>
  )
}

export default function ColorPreviewPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#03030a', padding: '40px 20px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');
      `}</style>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 600, letterSpacing: 2, marginBottom: 48, textTransform: 'uppercase' }}>
        Font Comparison
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 60, maxWidth: 420, margin: '0 auto' }}>
        {fonts.map((f) => (
          <div key={f.label}>
            <div style={{ marginBottom: 14, textAlign: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: cyan.accent, fontFamily: f.font }}>{f.label}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{f.desc}</span>
            </div>
            <MiniLogin font={f.font} titleWeight={f.titleWeight} letterSpacing={f.letterSpacing} />
          </div>
        ))}
      </div>
    </div>
  )
}
