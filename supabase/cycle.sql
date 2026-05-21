-- 5-A: 월경 주기 데이터 (profiles 테이블 확장)

alter table profiles
  add column if not exists cycle_days int check (cycle_days between 14 and 60),
  add column if not exists last_period_date date;
