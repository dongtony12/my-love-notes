-- 단일 user, 4가지 카테고리 항목을 저장하는 테이블
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('dont', 'like', 'dislike', 'wishlist')),
  content text not null,
  note text,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_category_idx on items (user_id, category, created_at desc);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- RLS: 본인 데이터만 접근
alter table items enable row level security;

drop policy if exists "items_select_own" on items;
create policy "items_select_own" on items
  for select using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on items;
create policy "items_insert_own" on items
  for insert with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on items;
create policy "items_update_own" on items
  for update using (auth.uid() = user_id);

drop policy if exists "items_delete_own" on items;
create policy "items_delete_own" on items
  for delete using (auth.uid() = user_id);
