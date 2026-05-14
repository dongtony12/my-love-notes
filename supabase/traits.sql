-- 4차 MVP: 특징 탭 (질문 탭 대체)

-- 신규 테이블
create table if not exists traits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  content text not null default '',
  is_pinned boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists traits_user_pin_idx
  on traits(user_id, is_pinned desc, position, created_at desc);

drop trigger if exists traits_set_updated_at on traits;
create trigger traits_set_updated_at
  before update on traits
  for each row execute function set_updated_at();

alter table traits enable row level security;

drop policy if exists "traits_select_own" on traits;
create policy "traits_select_own" on traits
  for select using (auth.uid() = user_id);

drop policy if exists "traits_insert_own" on traits;
create policy "traits_insert_own" on traits
  for insert with check (auth.uid() = user_id);

drop policy if exists "traits_update_own" on traits;
create policy "traits_update_own" on traits
  for update using (auth.uid() = user_id);

drop policy if exists "traits_delete_own" on traits;
create policy "traits_delete_own" on traits
  for delete using (auth.uid() = user_id);

-- 기존 questions 테이블 폐기 (4차에서 사용 안 함)
drop table if exists questions;
