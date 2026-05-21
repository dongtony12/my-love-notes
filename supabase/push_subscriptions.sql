-- 5-B: FCM 푸시 토큰 저장

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  device_label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_subscriptions_user_idx
  on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on push_subscriptions;
create policy "push_subscriptions_update_own" on push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (auth.uid() = user_id);
