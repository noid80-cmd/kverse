@AGENTS.md

# Kpick (kverse) 프로젝트

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
/                     랜딩
/dashboard            talent 홈 (오디션 카드 슬라이더, 북마크)
/dashboard/auditions  오디션 전체 목록
/reactions            북마크/좋아요 모아보기
/explore              커버 탐색
/videos/[id]          영상 상세
/videos/upload        영상 업로드
/talent/[id]          talent 프로필
/profile/edit         프로필 편집
/onboarding           신규 가입 온보딩 (홈화면 추가, 알림 설정)
/chat/[id]            agency ↔ talent 채팅

/agency/discover      기획사 커버 탐색
/agency/discover/[id] 커버 상세 (기획사 뷰)
/agency/auditions     오디션 목록
/agency/auditions/[id] 오디션 상세
/agency/talents       관심 talent 목록
/agency/talents/[id]  talent 상세
/agency/contacts      연락처
/agency/settings      기획사 설정 (알림 포함)

/admin                어드민 대시보드
/admin/users          유저 관리
/admin/agencies       기획사 관리
/admin/auditions      오디션 관리
/admin/videos         영상 관리
```

## 주요 Supabase 테이블
- `profiles` — 유저 기본정보 + role
- `videos` — 커버 영상 (R2 URL)
- `auditions` — 오디션 공고
- `applications` — 오디션 지원
- `bookmarks` — talent의 북마크
- `likes` — 좋아요
- `chats` / `messages` — 채팅
- `push_subscriptions` — 웹 푸시 구독

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
- `agency/talents/page.tsx` — undefined 링크 수정 필요
- `dashboard/page.tsx` — auditionIdx 범위 초과 수정 필요
- `discover/[id]/page.tsx` — setStarting 누락 수정 필요
- `reactions/page.tsx` — deleted_by_talent 필터 수정 필요
