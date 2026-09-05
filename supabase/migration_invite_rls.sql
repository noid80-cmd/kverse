-- ─────────────────────────────────────────────────────────────
-- agency_invites 를 잠근다 (2026-09-06)
--
-- 이 테이블에 RLS가 없어서 공개 anon 키로 전체가 읽혔다. 그 안의 token은
-- 곧 자격증명이다 — 미사용·미만료 토큰을 주우면 /api/agency-invite 로
-- 기획사 계정을 만들 수 있고, 그 계정은 지망생 프로필과 연락처를 본다.
-- anon 키는 브라우저 번들에 들어가는 공개값이라 누구나 가진다.
--
-- 점검 시점에 미만료 토큰이 0건이라 실제 유출은 없었지만, 다음 기획사를
-- 초대하는 순간 진짜 구멍이 된다.
--
-- 서버(/api/agency-invite)는 서비스 롤로 읽으므로 RLS를 우회한다. 즉
-- 초대 링크로 가입하는 흐름은 이 변경에 영향받지 않는다.
-- 클라이언트에서 이 테이블을 만지는 곳은 어드민의 초대 생성(insert)
-- 하나뿐이라, 어드민 정책만 열어두면 된다.
-- ─────────────────────────────────────────────────────────────

alter table agency_invites enable row level security;

-- 혹시 남아 있을 수 있는 공개 조회 정책을 걷어낸다.
drop policy if exists "agency_invites 전체 공개" on agency_invites;
drop policy if exists "Enable read access for all users" on agency_invites;
drop policy if exists "public select agency_invites" on agency_invites;

drop policy if exists "어드민만 초대를 관리한다" on agency_invites;
create policy "어드민만 초대를 관리한다"
  on agency_invites for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 확인용: 아래가 0행이어야 한다(어드민이 아닌 세션에서 실행 시).
-- select count(*) from agency_invites;
