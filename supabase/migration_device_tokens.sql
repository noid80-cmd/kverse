-- 앱(FCM) 기기 토큰
--
-- 스토어에서 받은 iOS 앱은 WKWebView라 웹 푸시(PushManager)가 존재하지 않는다.
-- 그래서 앱 사용자에게는 알림이 한 통도 가지 않았다. 앱에서는 FCM 토큰을 받아
-- 여기에 저장하고, 서버가 그 토큰으로 직접 보낸다.
-- 웹/PWA/안드로이드 TWA는 기존 push_subscriptions(웹푸시)를 그대로 쓴다.

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on device_tokens(user_id);

alter table device_tokens enable row level security;

-- 본인 토큰만 다룰 수 있다. 발송은 서비스 롤로 하므로 정책 영향을 받지 않는다.
drop policy if exists "own tokens" on device_tokens;
create policy "own tokens" on device_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
