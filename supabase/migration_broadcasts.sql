-- ─────────────────────────────────────────────────────────────
-- 어드민 공지 발송 기록 (2026-09-06)
--
-- 푸시는 취소가 안 된다. 그래서 "보냈나 안 보냈나"를 기억에 의존하면
-- 같은 공지를 두 번 보내는 사고가 난다 — 특히 10/1처럼 여러 사람이
-- 붙어 있는 날에.
--
-- 발송 결과(웹/앱 각각 몇 건)도 같이 남긴다. 나중에 "그날 알림이 안
-- 왔다"는 얘기가 나올 때 실제로 몇 명에게 나갔는지 확인할 근거가 된다.
-- ─────────────────────────────────────────────────────────────

create table if not exists admin_broadcasts (
  id         uuid primary key default gen_random_uuid(),
  sent_by    uuid references profiles(id) on delete set null,
  title      text not null,
  body       text not null,
  url        text,
  recipients int  not null default 0,  -- 발송 시점에 알림이 닿는 사람 수
  web_sent   int  not null default 0,
  app_sent   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_broadcasts_created_at_idx
  on admin_broadcasts (created_at desc);

alter table admin_broadcasts enable row level security;

-- 서버는 서비스 롤로 쓰므로 RLS를 우회한다. 이 정책은 어드민 화면이
-- 목록을 직접 읽을 때를 위한 것이다.
drop policy if exists "어드민만 공지 기록을 본다" on admin_broadcasts;
create policy "어드민만 공지 기록을 본다"
  on admin_broadcasts for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
