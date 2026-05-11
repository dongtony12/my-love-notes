-- Phase 4 (3차 MVP): 궁금한 질문 리스트

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  answer text,
  is_answered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_user_status_idx
  on questions(user_id, is_answered, created_at desc);

drop trigger if exists questions_set_updated_at on questions;
create trigger questions_set_updated_at
  before update on questions
  for each row execute function set_updated_at();

alter table questions enable row level security;

drop policy if exists "questions_select_own" on questions;
create policy "questions_select_own" on questions
  for select using (auth.uid() = user_id);

drop policy if exists "questions_insert_own" on questions;
create policy "questions_insert_own" on questions
  for insert with check (auth.uid() = user_id);

drop policy if exists "questions_update_own" on questions;
create policy "questions_update_own" on questions
  for update using (auth.uid() = user_id);

drop policy if exists "questions_delete_own" on questions;
create policy "questions_delete_own" on questions
  for delete using (auth.uid() = user_id);
