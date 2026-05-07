-- Phase 2: 사용자 프로필 (헤더 텍스트 커스터마이즈)

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  header_text text not null default '🧡 my love notes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거 (기존 함수 재사용)
drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- RLS: 본인 프로필만 접근
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id);

-- 신규 가입 시 자동 프로필 생성 트리거
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 기존 사용자(본인) 프로필 백필 - 없으면 자동 생성
insert into profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
