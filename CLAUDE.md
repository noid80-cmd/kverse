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
**기획사가 직접 발굴하는 온라인 오디션 플랫폼.** 매주 한 곳씩 순서대로 회차가
열린다(월 18시 오픈 → 일 21시 마감, 1회차만 10/1~10/11). 회차당 기획사는
한 곳뿐이고 새치기는 코드로 막혀 있다 — 규칙은 `lib/launch.ts` 한 곳에 있다.
커버 커뮤니티는 접었다. 영상·탐색은 오디션 밖에서 사람을 찾는 보조 경로다.

### 사용자 역할 (`profiles.role`)
| 역할 | 설명 | 로그인 후 이동 |
|------|------|---------------|
| `talent` | 일반 유저 (커버 업로드, 오디션 지원) | `/dashboard` |
| `agency` | 기획사 (지원 영상 심사, 탐색) | `/agency/auditions` |
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
/account/password      비밀번호 설정 (코드 로그인 직후 거쳐간다)

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
/api/cron/close-auditions       매일 18시 KST. 세 가지를 한다 —
                                예약 회차 자동 오픈(+전체 알림), 마감됐는데 안 본
                                지원자가 있는 기획사에 재촉, 마감+7일 자동 정리.
                                ?dry=1 이면 계산만 한다
/api/cron/deadline-reminders    마감 D-1 / 당일 알림 (매일 19시 KST, ?dry=1 미리보기)
/api/admin/auditions            어드민 오디션 CRUD (신청 건에 담당자 연락처 포함)
/api/admin/pending-results      결과 미입력 회차 + 담당자 연락처
/api/admin/broadcast            공지 발송 (dry:true 면 대상 수만)
/api/admin/agency-account       기획사 계정 생성 (명함 이메일로. 초대 링크는 폐기)
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
- **미실행 마이그레이션 없음** (2026-09-07 확인). `migration_broadcasts.sql`은
  이미 적용돼 있다.
- 로그인은 이메일+비밀번호, 소셜, **이메일 인증 코드** 세 가지다. 코드 로그인은
  로그인 화면의 "비밀번호를 잊으셨나요?"가 입구고, 들어오면 비밀번호 설정
  화면으로 보낸다. 코드 자릿수는 Supabase 설정이라 화면에서 고정하지 않는다.
- **이메일 인증(Confirm signup)은 꺼둬야 한다.** `/auth/confirm`이 로그인으로
  넘기기만 하는 껍데기라, 켜면 가입이 막힌다.
- 비밀번호 재설정 메일은 `{{ .TokenHash }}` 방식이다. 기본값인
  `{{ .ConfirmationURL }}`은 요청한 브라우저에서만 열려서, 메일 앱에서 열면 실패한다.
