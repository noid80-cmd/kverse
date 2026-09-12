-- 지원서에 경력 칸 (2026-09-12)
-- Supabase 대시보드 → SQL Editor에서 한 번 실행. 다시 돌려도 안전하다.
--
-- 기획사는 실제 지원서에서 경력을 요구한다. 그런데 이걸 공개 프로필의
-- 자기소개에 적게 하면 "○○학원, ○○콩쿠르 입상"처럼 신원을 특정하는 정보가
-- 다른 지망생에게까지 열린다 — 본명을 떼어낸 이유와 정면으로 어긋난다.
--
-- 그래서 경력은 지원 정보다. profiles에 두면 기획사·어드민만 읽는다(그쪽
-- select 정책이 이미 그렇게 돼 있다). 지망생끼리는 못 본다.
alter table profiles
  add column if not exists career text;

-- 지원한 시점의 경력을 지원 건에 함께 남긴다. 나중에 프로필의 경력을
-- 고쳐도, 그때 낸 지원서는 그때 적은 내용 그대로여야 한다.
alter table audition_applications
  add column if not exists career text;
