-- 최종 결과와 실적 (2026-09-04, 두 번째)
-- Supabase → SQL Editor에서 한 번 실행. 다시 돌려도 안전하다.


-- ─────────────────────────────────────────────────────────────
-- 1. 1차 합격 이후의 결과
--
-- 2차부터는 오프라인 일정이라 앱 안에서 관측할 방법이 없다. 기획사에 물어도
-- 답할 이유가 없다. 그래서 Krookie 담당자가 직접 확인해 기록한다.
-- 인원이 적은 동안은 이게 가장 확실하고 빠르다.
--
-- status는 그대로 'invited'로 두고 outcome을 따로 둔다. status를 덮어쓰면
-- "이 사람이 1차 합격했었다"는 사실이 사라져서 회차별 집계가 깨진다.
-- ─────────────────────────────────────────────────────────────
alter table audition_applications
  add column if not exists outcome      text,
  add column if not exists outcome_note text,
  add column if not exists outcome_at   timestamptz;

alter table audition_applications drop constraint if exists audition_applications_outcome_check;
alter table audition_applications add constraint audition_applications_outcome_check
  check (outcome is null or outcome in ('in_progress', 'passed', 'rejected'));


-- ─────────────────────────────────────────────────────────────
-- 2. 실적
--
-- 지금 랜딩의 "FNC 최종 합격자 2명"은 코드에 박혀 있다. 오디션을 서른 번
-- 열어도 보여줄 게 안 늘어난다는 뜻이고, 지망생 유입의 근거가 거기서 멈춘다.
--
-- 이름은 스냅샷으로 남긴다. 지망생이 탈퇴하거나 기획사명이 바뀌어도 실적은
-- 사실로 남아야 하고, 참조로만 두면 그때 문장이 깨진다.
-- 공개 여부를 따로 두는 건 본인이 원치 않는 경우가 있기 때문이다.
-- ─────────────────────────────────────────────────────────────
create table if not exists success_stories (
  id           uuid primary key default gen_random_uuid(),
  talent_id    uuid references profiles(id) on delete set null,
  talent_name  text not null,
  agency_id    uuid references agencies(id) on delete set null,
  agency_name  text not null,
  audition_id  uuid,
  kind         text not null default 'final_pass'
               check (kind in ('final_pass', 'contract', 'debut')),
  happened_on  date not null default current_date,
  note         text,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists success_stories_public_idx
  on success_stories (is_public, happened_on desc);

alter table success_stories enable row level security;

-- 랜딩에서 로그인 없이도 보여야 한다.
drop policy if exists "공개 실적은 누구나 본다" on success_stories;
create policy "공개 실적은 누구나 본다"
  on success_stories for select to anon, authenticated
  using (is_public = true);

drop policy if exists "어드민이 실적을 관리한다" on success_stories;
create policy "어드민이 실적을 관리한다"
  on success_stories for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
