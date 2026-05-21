-- 5-A 보완: 주기 변동폭 (±N일)

alter table profiles
  add column if not exists cycle_variance int
    check (cycle_variance between 0 and 7)
    default 3;
