-- 본명 분리 (2026-09-12)
-- Supabase 대시보드 → SQL Editor에서 한 번 실행. 다시 돌려도 안전하다.
--
-- 왜 나누나.
--
-- profiles.name 하나가 공개 화면 전부에 쓰인다 — 탐색, 영상 업로더, 프로필,
-- 채팅. 그런데 가입할 때 소셜 계정 이름이 그대로 들어와서 대부분 본명이다.
-- 전화번호는 1차 합격 전까지 잠가 뒀는데(lib/contactGate.ts) 본명은 아무나
-- 보는 상태였다.
--
-- 심사 전에 본명을 알면 기획사가 인스타그램을 뒤져보고 나서 영상을 본다.
-- 그건 영상으로 뽑는 게 아니다. 그래서 본명은 1차 합격(status='invited')
-- 뒤에만 열린다 — 연락처와 같은 문이다.
--
-- profiles에 컬럼을 더하지 않고 테이블을 나눈 이유: profiles는 기획사·어드민이
-- 통째로 select 할 수 있어서, 컬럼만 더하면 화면에서 감춰도 API로는 그냥
-- 읽힌다. 행 단위로 막으려면 테이블이 따로여야 한다.


-- ─────────────────────────────────────────────────────────────
-- 1. 본명 테이블
-- ─────────────────────────────────────────────────────────────
create table if not exists talent_identities (
  talent_id  uuid primary key references profiles(id) on delete cascade,
  real_name  text not null,
  updated_at timestamptz not null default now()
);

alter table talent_identities enable row level security;


-- ─────────────────────────────────────────────────────────────
-- 2. 누가 볼 수 있는지 판정
--
-- 정책 안에서 audition_applications를 그냥 조회하면 안 된다. 그 테이블에도
-- RLS가 걸려 있어서 조회하는 사람에 따라 0건이 나오고, 그러면 정책이 조용히
-- 거짓이 된다 — is_blocked를 security definer로 만든 것과 같은 이유다.
-- ─────────────────────────────────────────────────────────────
create or replace function can_see_real_name(p_viewer uuid, p_talent uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    -- 내 회차에 지원했고 내가 1차 합격시킨 사람
    exists (
      select 1
      from audition_applications aa
      join auditions a       on a.id = aa.audition_id
      join agency_members am on am.agency_id = a.agency_id
      where aa.talent_id = p_talent
        and aa.status = 'invited'
        and am.profile_id = p_viewer
    )
    -- 내가 보낸 제안을 본인이 수락한 사람. 지망생이 직접 수락한 자리라
    -- 연락처가 이미 열려 있다(contactGate의 offer_accepted와 같은 문).
    or exists (
      select 1
      from audition_offers o
      where o.talent_id = p_talent
        and o.agency_member_id = p_viewer
        and o.status = 'accepted'
    )
    or exists (
      select 1 from profiles p where p.id = p_viewer and p.role = 'admin'
    );
$$;

revoke all on function can_see_real_name(uuid, uuid) from public;
grant execute on function can_see_real_name(uuid, uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────
-- 3. 정책
-- ─────────────────────────────────────────────────────────────
drop policy if exists "본인 본명은 본인이 관리한다" on talent_identities;
create policy "본인 본명은 본인이 관리한다"
  on talent_identities for all to authenticated
  using (auth.uid() = talent_id)
  with check (auth.uid() = talent_id);

drop policy if exists "1차 합격 뒤에만 본명이 열린다" on talent_identities;
create policy "1차 합격 뒤에만 본명이 열린다"
  on talent_identities for select to authenticated
  using (can_see_real_name(auth.uid(), talent_id));
