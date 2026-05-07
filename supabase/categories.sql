-- Phase 3: 사용자 커스텀 카테고리 + items 마이그레이션

-- 1) categories 테이블
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '📌',
  display_type text not null default 'list'
    check (display_type in ('list', 'checklist', 'priority', 'rule')),
  position int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_user_pos_idx
  on categories(user_id, position);

-- updated_at 트리거
drop trigger if exists categories_set_updated_at on categories;
create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

-- RLS
alter table categories enable row level security;

drop policy if exists "categories_select_own" on categories;
create policy "categories_select_own" on categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on categories;
create policy "categories_insert_own" on categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on categories;
create policy "categories_update_own" on categories
  for update using (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on categories;
create policy "categories_delete_own" on categories
  for delete using (auth.uid() = user_id);

-- 2) items 테이블에 category_id 추가 (nullable로 시작)
alter table items
  add column if not exists category_id uuid references categories(id) on delete cascade;

create index if not exists items_category_id_idx
  on items(category_id, created_at desc);

-- 3) 기존 모든 사용자에게 기본 4개 카테고리 시드 (이미 있으면 skip)
insert into categories (user_id, name, emoji, display_type, position, is_default)
select u.id, '하지 말 것', '🚫', 'rule', 0, true from auth.users u
where not exists (
  select 1 from categories c where c.user_id = u.id and c.name = '하지 말 것'
);

insert into categories (user_id, name, emoji, display_type, position, is_default)
select u.id, '좋아하는 것', '❤️', 'list', 1, true from auth.users u
where not exists (
  select 1 from categories c where c.user_id = u.id and c.name = '좋아하는 것'
);

insert into categories (user_id, name, emoji, display_type, position, is_default)
select u.id, '싫어하는 것', '👎', 'list', 2, true from auth.users u
where not exists (
  select 1 from categories c where c.user_id = u.id and c.name = '싫어하는 것'
);

insert into categories (user_id, name, emoji, display_type, position, is_default)
select u.id, '같이 할 것', '✨', 'checklist', 3, true from auth.users u
where not exists (
  select 1 from categories c where c.user_id = u.id and c.name = '같이 할 것'
);

-- 4) 기존 items.category 값을 새 categories의 id로 매핑
update items i set category_id = c.id
from categories c
where c.user_id = i.user_id
  and i.category_id is null
  and (
    (i.category = 'dont' and c.name = '하지 말 것') or
    (i.category = 'like' and c.name = '좋아하는 것') or
    (i.category = 'dislike' and c.name = '싫어하는 것') or
    (i.category = 'wishlist' and c.name = '같이 할 것')
  );

-- 5) 매핑 안 된 row가 있는지 확인 (있으면 NOT NULL 강제 시 실패)
do $$
declare
  unmapped_count int;
begin
  select count(*) into unmapped_count from items where category_id is null;
  if unmapped_count > 0 then
    raise notice '매핑 실패한 items: % rows. category_id NOT NULL을 적용하지 않음', unmapped_count;
  else
    alter table items alter column category_id set not null;
    raise notice 'items.category_id 모두 매핑됨. NOT NULL 적용 완료';
  end if;
end $$;

-- 6) 신규 가입자에게 기본 카테고리 4개 자동 시드
create or replace function seed_default_categories() returns trigger as $$
begin
  insert into categories (user_id, name, emoji, display_type, position, is_default) values
    (new.id, '하지 말 것', '🚫', 'rule', 0, true),
    (new.id, '좋아하는 것', '❤️', 'list', 1, true),
    (new.id, '싫어하는 것', '👎', 'list', 2, true),
    (new.id, '같이 할 것', '✨', 'checklist', 3, true);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_seed_categories on auth.users;
create trigger on_auth_user_seed_categories
  after insert on auth.users
  for each row execute function seed_default_categories();

-- 7) 기존 items.category 컬럼을 nullable로 풀기
-- 새 insert는 category_id 만 사용. category 컬럼은 호환성을 위해 일단 남겨둠.
alter table items alter column category drop not null;

-- 참고: 기존 items.category(text) 컬럼은 일단 남겨둠.
-- Phase 3-B 또는 Phase 4 안정화 후 drop 예정.
