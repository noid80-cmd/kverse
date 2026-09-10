-- 버그 신고 (2026-09-10)
--
-- 실제 DB에 적용한 내용을 파일로 남긴다 — group-schema.sql이 DB보다 뒤처져서
-- 겪은 문제를 반복하지 않기 위해서다.
--
-- 저장은 서버 라우트(app/api/report-bug/route.ts)가 service role로만 한다.
-- insert 정책을 두지 않으므로 클라이언트는 직접 넣지 못한다 — 열어두면
-- 아무나 수천 건을 밀어넣을 수 있다.

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  role text,                       -- 지망생/기획사 구분. 요청 값이 아니라 DB에서 읽어 넣는다
  message text not null,
  page text,
  user_agent text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 답장 (2026-09-10). 처리했다고 관리자 화면에만 표시하면 신고한 사람은
-- 아무것도 못 받는다 — 답장을 남기고 신고자에게 푸시로 알린다.
alter table public.bug_reports add column if not exists admin_reply text;
alter table public.bug_reports add column if not exists replied_at timestamptz;

alter table public.bug_reports enable row level security;

drop policy if exists "bug_reports_select" on public.bug_reports;
create policy "bug_reports_select" on public.bug_reports for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "bug_reports_update_admin" on public.bug_reports;
create policy "bug_reports_update_admin" on public.bug_reports for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index if not exists bug_reports_created_idx
  on public.bug_reports (resolved_at, created_at desc);
