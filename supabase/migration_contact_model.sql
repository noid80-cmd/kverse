-- 접촉 모델 마이그레이션 (2026-09-04)
-- Supabase 대시보드 → SQL Editor에서 한 번 실행.
-- 아래 다섯 덩어리는 서로 독립적이라 부분 실행해도 안전하고, 다시 돌려도 된다.
--
-- 지금 배포된 코드는 이 컬럼들을 아직 읽지 않는다. 즉 실행하지 않아도 앱은
-- 그대로 돌아가고, 실행해도 깨지지 않는다. 순서를 신경 쓸 필요 없다.


-- ─────────────────────────────────────────────────────────────
-- 1. 결정 시각을 남긴다
--
-- 지금은 created_at(지원한 시각)뿐이라 "언제 결정됐는지"를 알 수 없다.
-- 마감 7일 기한도, 회차별 실적 집계도 이게 없으면 계산이 안 된다.
-- auto_decided는 기획사가 직접 눌렀는지 기한이 지나 자동 처리된 건지 구분한다
-- — 결과를 방치하는 기획사를 추적하려면 이 구분이 필요하다.
-- ─────────────────────────────────────────────────────────────
alter table audition_applications
  add column if not exists decided_at   timestamptz,
  add column if not exists auto_decided boolean not null default false;

create index if not exists audition_applications_audition_status_idx
  on audition_applications (audition_id, status);


-- ─────────────────────────────────────────────────────────────
-- 2. 관심 취소를 조용하게 만든다
--
-- 지금은 취소하면 행이 통째로 지워져서 지망생 화면에서도 사라진다.
-- "하이브가 관심을 표시했다"는 건 일어났던 사실이고, 기획사가 마음을 바꿔도
-- 그 사실이 사라지진 않는다. 지망생 쪽 기록은 남기고 기획사 목록에서만 빼려면
-- 지우지 말고 표시만 해야 한다. 깔때기(관심 → 1차 합격) 분석에도 취소분이 필요하다.
-- ─────────────────────────────────────────────────────────────
alter table bookmarks
  add column if not exists cancelled_at timestamptz;

-- 취소한 뒤 같은 지망생에게 다시 관심을 표시할 수 있어야 하므로,
-- 유니크 제약을 "취소되지 않은 행"에만 건다.
alter table bookmarks
  drop constraint if exists bookmarks_agency_member_id_talent_id_video_id_key;

create unique index if not exists bookmarks_active_uniq
  on bookmarks (agency_member_id, talent_id, video_id)
  where cancelled_at is null;


-- ─────────────────────────────────────────────────────────────
-- 3. 대화를 신고할 수 있게 한다
--
-- target_type이 'video'|'profile'뿐이라 대화를 신고할 수가 없었다.
-- 그런데 이상한 요구는 프로필이 아니라 대화에서 나온다.
-- ─────────────────────────────────────────────────────────────
alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('video', 'profile', 'conversation'));


-- ─────────────────────────────────────────────────────────────
-- 4. 차단을 실제 차단으로 만든다
--
-- blocked_users는 지금 "내 피드에서 저 사람 콘텐츠를 숨긴다"로만 쓰인다.
-- 지망생이 기획사를 차단해도 그 기획사는 여전히 대화를 걸고 메시지를 보낼 수
-- 있다. 형님이 원한 건 그게 아니다.
--
-- 정책 안에서 blocked_users를 그냥 조회하면 안 된다. blocked_users의 RLS가
-- "본인이 차단한 것만 조회"라서, 차단당한 기획사가 조회하면 0건이 나오고
-- 정책이 항상 통과해버린다. security definer 함수로 RLS를 우회해서 판정한다.
-- 이러면 기획사는 차단 사실을 알 수도 없다 — 알면 우회하거나 감정적으로 대응한다.
-- ─────────────────────────────────────────────────────────────
create or replace function is_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocked_users
    where blocker_id = p_blocker and blocked_id = p_blocked
  );
$$;

revoke all on function is_blocked(uuid, uuid) from public;
grant execute on function is_blocked(uuid, uuid) to authenticated;

-- restrictive 정책은 기존 정책과 AND로 묶인다. 기존 정책을 몰라도 안전하게
-- 조건만 덧붙일 수 있다.
drop policy if exists "차단한 상대와는 대화가 열리지 않는다" on conversations;
create policy "차단한 상대와는 대화가 열리지 않는다"
  on conversations as restrictive for insert to authenticated
  with check (not is_blocked(talent_id, agency_member_id));

drop policy if exists "차단당한 기획사는 메시지를 보낼 수 없다" on messages;
create policy "차단당한 기획사는 메시지를 보낼 수 없다"
  on messages as restrictive for insert to authenticated
  with check (
    not exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and auth.uid() = c.agency_member_id
        and is_blocked(c.talent_id, c.agency_member_id)
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 5. 오디션 제안 (피드 경로)
--
-- 기획사가 피드에서 좋은 지망생을 발견했을 때, 다음 공고를 기다리지 않고
-- 바로 접촉할 수 있는 유일한 문이다. 이게 없으면 기획사는 인스타로 샌다.
--
-- 지원(audition_applications)이 아니라 제안이라 별도 테이블이다. 수락/거절/만료
-- 상태가 따로 필요하고, 회차가 아니라 상시라 집계도 따로 해야 한다.
--
-- 지망생 수락이 있어야 대화가 열린다. 기획사가 일방적으로 채팅을 열 수 없다는
-- 건 미성년자가 다수인 앱에서 그 자체로 안전장치다.
-- ─────────────────────────────────────────────────────────────
create table if not exists audition_offers (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid not null references agencies(id) on delete cascade,
  agency_member_id uuid not null references profiles(id) on delete cascade,
  talent_id        uuid not null references profiles(id) on delete cascade,
  -- 어느 영상을 보고 제안했는지. 영상이 지워져도 제안 기록은 남긴다.
  video_id         uuid references videos(id) on delete set null,
  message          text not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  -- 무기한 대기는 지저분하다. 답이 없으면 조용히 만료시킨다.
  expires_at       timestamptz not null default now() + interval '14 days'
);

create index if not exists audition_offers_talent_idx  on audition_offers (talent_id, status);
create index if not exists audition_offers_agency_idx  on audition_offers (agency_id, created_at desc);

alter table audition_offers enable row level security;

drop policy if exists "기획사는 자기 제안을 관리한다" on audition_offers;
create policy "기획사는 자기 제안을 관리한다"
  on audition_offers for all to authenticated
  using (auth.uid() = agency_member_id)
  with check (auth.uid() = agency_member_id);

drop policy if exists "지망생은 받은 제안을 본다" on audition_offers;
create policy "지망생은 받은 제안을 본다"
  on audition_offers for select to authenticated
  using (auth.uid() = talent_id);

-- 지망생은 수락/거절만 할 수 있다. 내용은 못 고친다.
drop policy if exists "지망생은 받은 제안에 응답한다" on audition_offers;
create policy "지망생은 받은 제안에 응답한다"
  on audition_offers for update to authenticated
  using (auth.uid() = talent_id)
  with check (auth.uid() = talent_id);

-- 차단한 기획사는 제안도 보낼 수 없다.
drop policy if exists "차단한 기획사는 제안할 수 없다" on audition_offers;
create policy "차단한 기획사는 제안할 수 없다"
  on audition_offers as restrictive for insert to authenticated
  with check (not is_blocked(talent_id, agency_member_id));
