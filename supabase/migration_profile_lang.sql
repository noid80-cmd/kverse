-- 사용자 언어
--
-- 화면 문구는 브라우저에서 고르면 되니 localStorage로 충분했다. 푸시는 서버가
-- 만들어 보내기 때문에 수신자의 언어를 서버가 알아야 한다 — 이 값이 없으면
-- 어느 나라 지망생에게든 한국어 알림이 간다.
--
-- 값이 없는 계정(기존 사용자, 아직 앱을 안 연 사람)은 한국어로 떨어진다.
-- 앱을 한 번 열면 그 시점의 언어가 채워진다.

alter table profiles add column if not exists lang text;

-- 발송할 때 대상자를 언어별로 묶어 읽는다
create index if not exists profiles_lang_idx on profiles(lang);
