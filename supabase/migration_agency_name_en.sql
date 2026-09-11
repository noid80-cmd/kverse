-- 기획사 이름의 공식 영문 표기.
--
-- 영어로 앱을 보는 사람에게 "미스틱스토리엔터테인먼트"가 한글 그대로 나왔다.
-- 오디션 공고는 translations(jsonb)로 이미 다국어를 지원하는데, 기획사 이름은
-- name 한 칸뿐이라 번역할 자리가 없었다.
--
-- 언어별 jsonb 대신 영문 한 칸만 둔다. 기획사 이름은 번역이 아니라 표기이고,
-- 공식 표기는 어느 나라 말로 봐도 하나다(CUBE Entertainment는 일본어 화면에서도
-- CUBE Entertainment다). 칸을 열 개 만들어 봐야 같은 값이 열 번 들어간다.
--
-- 비어 있으면 화면은 한글 이름으로 되돌아간다 — 새 기획사를 넣을 때 영문명을
-- 몰라도 등록이 막히지 않게.

alter table agencies add column if not exists name_en text;

comment on column agencies.name_en is
  '공식 영문 표기. 한국어가 아닌 화면에서 name 대신 쓴다. 비우면 name으로 되돌아간다.';
