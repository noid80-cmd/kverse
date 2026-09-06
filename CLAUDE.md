@AGENTS.md

# Krookie (kverse) 프로젝트

## 배포 & 저장소
- **URL**: kpick.app
- **GitHub**: noid80-cmd/kverse
- **플랫폼**: Vercel
- **commit/push는 허락 없이 바로 진행**

## 기술 스택
- Next.js App Router (TypeScript)
- Supabase (auth + DB)
- Cloudflare R2 (영상 업로드)
- Web Push (알림)
- i18n: `lib/i18n/translations.ts`

## 서비스 개요
K-pop 커버 커뮤니티 + 기획사 오디션 플랫폼

### 사용자 역할 (`profiles.role`)
| 역할 | 설명 | 로그인 후 이동 |
|------|------|---------------|
| `talent` | 일반 유저 (커버 업로드, 오디션 지원) | `/dashboard` |
| `agency` | 기획사 (커버 탐색, 오디션 관리) | `/agency/discover` |
| `admin` | 슈퍼 어드민 | `/admin` |

- 신규 유저는 `/onboarding` 거침
- 신규 agency는 `/onboarding?next=/agency/discover`

## 주요 페이지
```
/                      랜딩
/login /signup         로그인 · 가입
/forgot-password       재설정 메일 요청
/reset-password        새 비밀번호 설정 (?code= PKCE, ?token_hash= 둘 다 처리)
/onboarding            신규 가입 온보딩 (홈화면 추가, 알림 설정)

/dashboard             talent 홈 (오디션 카드 슬라이더, 북마크)
/dashboard/auditions   오디션 전체 목록
/audition/[id]         오디션 상세
/reactions             북마크/좋아요/제안 모아보기
/explore               커버 탐색
/videos /videos/[id] /videos/upload
/talent/[id]           talent 프로필
/profile/edit          프로필 편집
/chat/[id]             agency ↔ talent 채팅

/agency/discover       기획사 커버 탐색
/agency/discover/[id]  커버 상세 (기획사 뷰)
/agency/auditions      오디션 목록 · /agency/auditions/[id] 상세
/agency/talents        관심 talent · /agency/talents/[id] 상세
/agency/contacts       연락처
/agency/settings       기획사 설정 (알림 포함)

/admin                 대시보드 (신고·오디션 신청·결과 대기 배너)
/admin/users           유저 관리
/admin/agencies        기획사 관리 (초대 발급)
/admin/auditions       오디션 관리 (신청 승인 · 결과 대기 목록 · 담당자 연락처)
/admin/videos          영상 관리
/admin/outcomes        1차 합격자 추적 → success_stories
/admin/reports         신고 처리
/admin/broadcast       공지 발송 (미리보기 후 발송)
```

## API 라우트
```
/api/push                       푸시 발송. 전체(broadcast)는 어드민·크론만
/api/push/subscribe             웹 푸시 구독 저장
/api/device-token               앱 FCM 토큰 저장
/api/cron/close-auditions       마감+7일 회차 자동 마감 (매일 09시 KST)
/api/cron/deadline-reminders    마감 D-1 / 당일 알림 (매일 19시 KST, ?dry=1 미리보기)
/api/admin/auditions            어드민 오디션 CRUD (신청 건에 담당자 연락처 포함)
/api/admin/pending-results      결과 미입력 회차 + 담당자 연락처
/api/admin/broadcast            공지 발송 (dry:true 면 대상 수만)
/api/agency-invite              초대 조회·사용 (서비스 롤 — RLS 우회)
/api/offers/respond             오디션 제안 수락/거절
/api/notify-signup              가입 텔레그램 알림
/api/notify-report              신고 텔레그램 알림 (로그인 필요)
```

## 주요 Supabase 테이블
- `profiles` — 유저 기본정보 + role (talent/agency/admin), phone, bio
- `videos` — 커버 영상 (R2 URL)
- `auditions` — 오디션 공고 (status: requested → active → closed)
- `audition_applications` — 오디션 지원 (pending/skip → invited/rejected)
- `audition_offers` — 피드 경로의 오디션 제안
- `agencies` / `agency_members` / `agency_invites` — 기획사와 담당자
- `conversations` / `messages` — 채팅
- `bookmarks` / `likes` / `contacts`
- `push_subscriptions` (웹) / `device_tokens` (앱 FCM)
- `reports` / `blocked_users` — UGC 안전 (Apple 1.2)
- `success_stories` — 랜딩에 쌓이는 최종 합격 실적
- `admin_broadcasts` — 공지 발송 기록

**마이그레이션은 `supabase/*.sql`을 SQL Editor에서 직접 실행한다.** CLI 연결이 없다.

## 아이콘 파일
- `app/icon.tsx` — favicon (32×32)
- `app/apple-icon.tsx` — iOS 홈화면 아이콘 (180×180)
- 현재 디자인: 마이크 (사용자 반응 별로, 변경 논의 중)
- 후보 비교 페이지: `/icon-preview`

## 자주 쓰는 패턴
- Supabase 클라이언트: `lib/supabase/client.ts` (브라우저), `lib/supabase/server.ts` (서버)
- Tailwind 클래스가 production에서 가끔 purge됨 → 중요한 스타일은 inline style 사용
- 영상은 R2에 멀티파트 업로드 후 Supabase에 URL 저장

## 진행 중 / 알려진 이슈

- 이전에 적혀 있던 4건(agency/talents undefined 링크, dashboard auditionIdx 범위,
  discover setStarting 누락, reactions deleted_by_talent 필터)은 **2026-09-06 확인 결과
  전부 이미 수정돼 있다.**
- **미실행 마이그레이션**: `supabase/migration_broadcasts.sql` (공지 발송 기록).
  없어도 발송은 되지만 기록이 안 남아 화면에 경고가 뜬다.
- **이메일 인증(Confirm signup)은 꺼둬야 한다.** `/auth/confirm`이 로그인으로
  넘기기만 하는 껍데기라, 켜면 가입이 막힌다.
- 비밀번호 재설정 메일은 `{{ .TokenHash }}` 방식이다. 기본값인
  `{{ .ConfirmationURL }}`은 요청한 브라우저에서만 열려서, 메일 앱에서 열면 실패한다.
