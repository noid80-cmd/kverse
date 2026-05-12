'use client'

import Link from 'next/link'
import { useT, useLanguage } from '@/lib/i18n'
import KverseLogo from '@/app/components/KverseLogo'

export default function PrivacyPage() {
  const t = useT()
  const { locale } = useLanguage()
  const isKo = locale === 'ko'

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <Link href="/" className="text-white/40 hover:text-white transition text-sm">🏠</Link>
        <KverseLogo />
        <div />
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-black text-white mb-2">
          {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
        </h1>
        <p className="text-white/40 text-sm mb-8">
          {isKo ? '최종 수정일: 2026년 5월 12일' : 'Last updated: May 12, 2026'}
        </p>

        {isKo ? (
          <div className="flex flex-col gap-8 text-white/70 text-sm leading-relaxed">
            <section>
              <h2 className="text-white font-bold text-base mb-3">1. 수집하는 개인정보</h2>
              <p>Kverse는 서비스 제공을 위해 다음 정보를 수집합니다:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li>이메일 주소 (회원가입 및 로그인)</li>
                <li>사용자 이름 및 닉네임</li>
                <li>프로필 정보 (성별, 국적, 자기소개)</li>
                <li>업로드한 커버 영상 및 관련 메타데이터</li>
                <li>서비스 이용 기록 (조회수, 좋아요 등)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">2. 개인정보 이용 목적</h2>
              <ul className="list-disc list-inside flex flex-col gap-1">
                <li>회원 가입 및 서비스 제공</li>
                <li>커버 영상 업로드 및 공유 기능 운영</li>
                <li>사용자 간 메시지(DM) 기능 제공</li>
                <li>커뮤니티 운영 및 부적절한 콘텐츠 관리</li>
                <li>서비스 개선 및 통계 분석</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">3. 제3자 서비스</h2>
              <p>Kverse는 다음 제3자 서비스를 이용합니다:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li><strong className="text-white">Supabase</strong>: 데이터베이스 및 인증 서비스 (미국 서버)</li>
                <li><strong className="text-white">Vercel</strong>: 웹 서버 및 CDN 호스팅</li>
                <li><strong className="text-white">Ready Player Me</strong>: 3D 아바타 생성 (선택 사항)</li>
              </ul>
              <p className="mt-2">각 서비스는 자체 개인정보 처리방침을 따릅니다.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">4. 개인정보 보유 기간</h2>
              <p>회원 탈퇴 시 개인정보는 즉시 삭제됩니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 동안 보관됩니다.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">5. 사용자 권리</h2>
              <p>사용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li>개인정보 열람 및 수정</li>
                <li>개인정보 삭제 요청 (계정 탈퇴)</li>
                <li>개인정보 처리 동의 철회</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">6. 쿠키 및 추적 기술</h2>
              <p>Kverse는 로그인 상태 유지를 위해 로컬 스토리지와 세션 쿠키를 사용합니다. 별도의 광고 추적 쿠키는 사용하지 않습니다.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">7. 미성년자 보호</h2>
              <p>Kverse는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만인 경우 서비스 이용을 제한할 수 있습니다.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">8. 문의</h2>
              <p>개인정보 처리방침에 관한 문의는 아래로 연락해 주세요:</p>
              <p className="mt-2 text-pink-400">support@kverse.app</p>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-8 text-white/70 text-sm leading-relaxed">
            <section>
              <h2 className="text-white font-bold text-base mb-3">1. Information We Collect</h2>
              <p>Kverse collects the following information to provide our service:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li>Email address (for account registration and login)</li>
                <li>Username and display name</li>
                <li>Profile information (gender, nationality, bio)</li>
                <li>Uploaded cover videos and related metadata</li>
                <li>Usage data (views, likes, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside flex flex-col gap-1">
                <li>Account registration and service provision</li>
                <li>Cover video upload and sharing features</li>
                <li>Direct messaging between users</li>
                <li>Community management and content moderation</li>
                <li>Service improvement and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">3. Third-Party Services</h2>
              <p>Kverse uses the following third-party services:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li><strong className="text-white">Supabase</strong>: Database and authentication (US servers)</li>
                <li><strong className="text-white">Vercel</strong>: Web hosting and CDN</li>
                <li><strong className="text-white">Ready Player Me</strong>: 3D avatar creation (optional)</li>
              </ul>
              <p className="mt-2">Each service is subject to its own privacy policy.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">4. Data Retention</h2>
              <p>Your personal data is deleted immediately upon account deletion. Data required to be retained by applicable law will be kept for the legally mandated period.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">5. Your Rights</h2>
              <p>You may exercise the following rights at any time:</p>
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li>Access and correct your personal information</li>
                <li>Request deletion of your data (account deletion)</li>
                <li>Withdraw consent to data processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">6. Cookies and Tracking</h2>
              <p>Kverse uses local storage and session cookies to maintain login state. We do not use advertising tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">7. Children's Privacy</h2>
              <p>Kverse does not knowingly collect personal information from children under 13 (or 14 in certain jurisdictions). If you are under this age, we may restrict access to our service.</p>
            </section>

            <section>
              <h2 className="text-white font-bold text-base mb-3">8. Contact</h2>
              <p>For questions about this privacy policy, please contact us:</p>
              <p className="mt-2 text-pink-400">support@kverse.app</p>
            </section>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-white/10">
          <Link href="/" className="text-pink-400 text-sm hover:underline">← {isKo ? '홈으로' : 'Back to Home'}</Link>
        </div>
      </div>
    </div>
  )
}
