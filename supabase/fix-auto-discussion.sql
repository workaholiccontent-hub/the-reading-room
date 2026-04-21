-- Fix for: ERROR 42P01 relation "admin_member_id" does not exist
-- The trigger function had a variable scoping issue. Run this to replace it.

create or replace function auto_create_discussion()
returns trigger as $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id
  from members
  where role = 'admin'
  limit 1;

  insert into discussions (club_pick_id, book_id, title, pinned, created_by)
  values (
    new.id,
    new.book_id,
    'Monthly discussion — ' || to_char(make_date(new.year, new.month, 1), 'Month YYYY'),
    true,
    v_admin_id
  );

  return new;
end;
$$ language plpgsql;
