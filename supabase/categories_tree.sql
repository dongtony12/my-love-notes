-- Phase 2 (3차 MVP): 카테고리 트리 - 1단계 부모-자식

-- parent_id 컬럼 추가
alter table categories
  add column if not exists parent_id uuid references categories(id) on delete cascade;

create index if not exists categories_parent_idx on categories(parent_id);

-- 1단계 깊이 제한: parent_id가 가리키는 row의 parent_id는 NULL이어야 함
-- (= 부모는 최상위만 가능, 손자 카테고리 X)
create or replace function check_category_depth() returns trigger as $$
declare
  parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  -- 자기 자신을 부모로 지정 못 하게
  if new.parent_id = new.id then
    raise exception '카테고리는 자기 자신을 부모로 지정할 수 없음';
  end if;

  select parent_id into parent_parent
    from categories where id = new.parent_id;

  if parent_parent is not null then
    raise exception '카테고리 트리는 1단계 깊이만 허용됩니다 (parent의 parent가 존재)';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists categories_check_depth on categories;
create trigger categories_check_depth
  before insert or update on categories
  for each row execute function check_category_depth();

-- 자식이 있는 부모를 자식으로 만들지 못하게 (순환 방지 보강)
-- 위 트리거는 새 row 입력 시 막음. 기존 row를 update해서 자식으로 만들려는 경우도
-- new.parent_id의 parent_parent를 체크하므로 자동 차단됨.
