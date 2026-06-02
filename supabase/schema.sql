-- KVERSE 오디션 플랫폼 DB 스키마

-- 역할 enum
create type user_role as enum ('talent', 'agency', 'admin');
create type video_category as enum ('vocal', 'dance', 'acting', 'rap', 'other');
create type video_status as enum ('processing', 'active', 'hidden', 'deleted');
create type contact_status as enum ('sent', 'read', 'replied');
create type notif_type as enum ('bookmark', 'contact', 'video_approved', 'live_start');

-- 사용자 프로필
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'talent',
  name text not null,
  birth_date date,
  gender text,
  phone text,
  avatar_url text,
  bio text,
  height int,
  weight int,
  skills text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기획사
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  description text,
  website text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 기획사 담당자 연결
create table agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(agency_id, profile_id)
);

-- 영상
create table videos (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration int,
  category video_category not null default 'other',
  tags text[] default '{}',
  status video_status not null default 'processing',
  view_count int not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 북마크 (기획사 → 지망생/영상)
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  agency_member_id uuid not null references profiles(id) on delete cascade,
  talent_id uuid not null references profiles(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique(agency_member_id, talent_id, video_id)
);

-- 연락 (기획사 → 지망생)
create table contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  talent_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  status contact_status not null default 'sent',
  created_at timestamptz not null default now()
);

-- 알림
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notif_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- updated_at 자동 업데이트
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger videos_updated_at before update on videos
  for each row execute function update_updated_at();

-- 신규 가입 시 프로필 자동 생성 (역할은 가입 후 업데이트)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'talent')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- RLS 활성화
alter table profiles enable row level security;
alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table videos enable row level security;
alter table bookmarks enable row level security;
alter table contacts enable row level security;
alter table notifications enable row level security;

-- profiles RLS
create policy "본인 프로필 전체 조회" on profiles for select using (auth.uid() = id);
create policy "기획사/어드민은 지망생 프로필 조회" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agency', 'admin')));
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);

-- agencies RLS
create policy "기획사 전체 공개" on agencies for select using (true);
create policy "어드민만 기획사 수정" on agencies for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- agency_members RLS
create policy "소속 담당자 조회" on agency_members for select
  using (profile_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- videos RLS
create policy "active 영상 기획사/어드민 조회" on videos for select
  using (status = 'active' and exists (
    select 1 from profiles where id = auth.uid() and role in ('agency', 'admin')
  ));
create policy "본인 영상 전체 조회" on videos for select using (talent_id = auth.uid());
create policy "지망생 영상 등록" on videos for insert
  with check (talent_id = auth.uid() and exists (
    select 1 from profiles where id = auth.uid() and role = 'talent'
  ));
create policy "본인 영상 수정" on videos for update using (talent_id = auth.uid());
create policy "어드민 영상 수정" on videos for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- bookmarks RLS
create policy "본인 북마크 조회" on bookmarks for select using (agency_member_id = auth.uid());
create policy "기획사만 북마크" on bookmarks for insert
  with check (agency_member_id = auth.uid() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency'
  ));
create policy "본인 북마크 삭제" on bookmarks for delete using (agency_member_id = auth.uid());

-- contacts RLS
create policy "발신자/수신자 조회" on contacts for select
  using (sender_id = auth.uid() or talent_id = auth.uid());
create policy "기획사만 연락 발송" on contacts for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency'
  ));
create policy "수신자 읽음 처리" on contacts for update using (talent_id = auth.uid());

-- notifications RLS
create policy "본인 알림만 조회" on notifications for select using (user_id = auth.uid());
create policy "본인 알림 읽음 처리" on notifications for update using (user_id = auth.uid());
