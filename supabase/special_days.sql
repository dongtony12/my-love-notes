-- Phase 3 (3차 MVP): 특별한 날 기록 (가벼운 타임라인)

create table if not exists special_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  content text,
  emoji text not null default '💝',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists special_days_user_date_idx
  on special_days(user_id, date desc);

drop trigger if exists special_days_set_updated_at on special_days;
create trigger special_days_set_updated_at
  before update on special_days
  for each row execute function set_updated_at();

alter table special_days enable row level security;

drop policy if exists "special_days_select_own" on special_days;
create policy "special_days_select_own" on special_days
  for select using (auth.uid() = user_id);

drop policy if exists "special_days_insert_own" on special_days;
create policy "special_days_insert_own" on special_days
  for insert with check (auth.uid() = user_id);

drop policy if exists "special_days_update_own" on special_days;
create policy "special_days_update_own" on special_days
  for update using (auth.uid() = user_id);

drop policy if exists "special_days_delete_own" on special_days;
create policy "special_days_delete_own" on special_days
  for delete using (auth.uid() = user_id);
