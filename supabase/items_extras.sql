-- Phase 4: items에 priority, is_pinned 컬럼 추가

alter table items
  add column if not exists priority int check (priority between 1 and 10),
  add column if not exists is_pinned boolean not null default false;

-- 인덱스: 카테고리별로 핀 → priority → 최신 순으로 빠르게 조회
create index if not exists items_category_sort_idx
  on items(category_id, is_pinned desc, priority desc nulls last, created_at desc);
