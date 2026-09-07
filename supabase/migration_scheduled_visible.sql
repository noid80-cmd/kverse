-- ─────────────────────────────────────────────────────────────
-- 예약된 회차를 일정표에서 읽을 수 있게 한다 (2026-09-07)
--
-- 공개 조회 정책이 active/closed만 허용해서, 예약(scheduled) 회차가
-- 익명 조회에서 아예 안 보였다. 지망생 앱은 익명 키로 읽으니
-- "2회차 · ○○기획사 · 예정"이 일정표에 뜨지 않는다 — 일정표의 존재
-- 이유가 "다음 주엔 어디가 열리나"인데 그게 막힌 셈이다.
--
-- 공고 목록에는 여전히 안 나온다. 목록 조회가 status in (active, closed)로
-- 걸러내기 때문이고, 그건 그대로 둔다. 예약분은 일정표에만 이름이 뜬다.
--
-- requested(미확정 신청)와 paused(멈춤)는 계속 가린다. 확정 전에 이름이
-- 나가면 조율이 깨졌을 때 없던 일이 된다.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "anyone can read active auditions" on auditions;

create policy "anyone can read scheduled and open auditions"
  on auditions for select
  using (status = any (array['scheduled'::text, 'active'::text, 'closed'::text]));
