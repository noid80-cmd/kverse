'use client'

import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E7', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ fontSize: 22, color: '#8A7F6E', background: 'none', border: 'none', padding: 0, marginBottom: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#241C15', marginBottom: 24 }}>이용약관 및 커뮤니티 가이드라인</h1>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>1. 서비스 소개</h2>
          <p style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.8 }}>
            Krookie(이하 &quot;서비스&quot;)는 K-pop 커버 영상 커뮤니티이자 기획사 오디션 연결 플랫폼입니다.
            이용자는 커버 영상을 업로드하고, 기획사는 이를 탐색하여 인재를 발굴할 수 있습니다.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>2. 커뮤니티 콘텐츠 정책 — 무관용 원칙</h2>
          <p style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.8, marginBottom: 8 }}>
            Krookie는 부적절한 콘텐츠와 괴롭힘 행위에 대해 <strong>무관용(Zero Tolerance)</strong> 원칙을 적용합니다.
            다음 행위는 엄격히 금지되며, 발견 시 즉시 콘텐츠가 삭제되고 계정이 정지될 수 있습니다.
          </p>
          <ul style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>선정적, 폭력적이거나 미성년자에게 유해한 콘텐츠</li>
            <li>타인에 대한 괴롭힘, 혐오 발언, 차별적 언행</li>
            <li>저작권 및 초상권을 침해하는 콘텐츠</li>
            <li>스팸, 사기, 허위 정보 유포</li>
            <li>타인을 사칭하거나 기망하는 행위</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>3. 신고 및 차단</h2>
          <p style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.8 }}>
            모든 영상 및 프로필에는 신고 버튼이 제공됩니다. 이용자는 부적절한 콘텐츠나 사용자를 언제든지
            신고할 수 있으며, 특정 사용자를 차단하면 해당 사용자의 콘텐츠가 즉시 내 피드에서 보이지 않게 됩니다.
            운영진은 접수된 신고를 <strong>24시간 이내</strong>에 검토하여, 위반이 확인될 경우 해당 콘텐츠를
            삭제하고 사용자 계정을 정지 조치합니다.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>4. 계정 정지 및 콘텐츠 삭제</h2>
          <p style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.8 }}>
            운영진은 본 약관을 위반한 콘텐츠를 사전 통보 없이 삭제할 수 있으며, 반복적이거나 심각한 위반의
            경우 해당 이용자의 계정을 정지할 수 있습니다. 정지된 계정은 서비스에 로그인할 수 없습니다.
          </p>
        </section>

        <section style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#241C15', marginBottom: 10 }}>5. 문의</h2>
          <p style={{ fontSize: 14, color: '#5A4F42', lineHeight: 1.8 }}>
            본 약관 또는 콘텐츠 신고와 관련하여 문의사항이 있으시면 서비스 내 신고 기능을 이용하거나
            운영팀에 문의해 주세요.
          </p>
        </section>
      </div>
    </div>
  )
}
