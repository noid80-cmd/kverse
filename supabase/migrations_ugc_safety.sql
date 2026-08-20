-- Apple 심사 Guideline 1.2 (UGC Safety) 대응: 신고/차단 테이블
-- Supabase 대시보드 SQL Editor에서 1회 실행

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('video','profile')),
  target_id uuid not null,
  reported_user_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending','actioned','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

create index if not exists reports_status_idx on reports(status);
create index if not exists blocked_users_blocker_idx on blocked_users(blocker_id);

alter table reports enable row level security;
alter table blocked_users enable row level security;

create policy "insert own report" on reports for insert
  with check (auth.uid() = reporter_id);

create policy "view own report" on reports for select
  using (auth.uid() = reporter_id);

create policy "admin select reports" on reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "admin update reports" on reports for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "manage own blocks" on blocked_users for all
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
