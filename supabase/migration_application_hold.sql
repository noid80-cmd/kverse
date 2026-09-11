-- 지원자 '보류' 상태 추가 (2026-09-11)
--
-- 기획사가 지원 영상을 백 건씩 넘겨 보다가, 1차 합격까지는 아니지만 한 번 더
-- 보고 싶은 사람을 담아 두는 자리다. 합격도 불합격도 아닌 미결정 상태라
-- 지망생에게는 아무 알림도 나가지 않는다. 마지막에 [심사 완료]를 누르면
-- 남은 보류 건은 다른 미결정 건과 함께 정리된다.
--
-- Supabase SQL Editor 에서 그대로 실행하면 된다.

-- status 에 걸린 CHECK 제약이 있으면 이름을 몰라도 찾아서 지운다.
-- (프로젝트마다 제약 이름이 달라 하드코딩하면 조용히 안 지워진다)
do $$
declare c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.audition_applications'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.audition_applications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.audition_applications
  add constraint audition_applications_status_check
  check (status in ('pending', 'skip', 'on_hold', 'invited', 'rejected'));

-- 보류만 따로 훑는 화면이 있어서 같이 세워 둔다.
create index if not exists audition_applications_audition_status_idx
  on public.audition_applications (audition_id, status);
