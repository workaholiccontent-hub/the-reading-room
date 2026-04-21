-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6: Full-text search · Activity feed · In-app notifications · Analytics
-- Run in Supabase SQL Editor AFTER phases 1–5
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Full-text search on books ──────────────────────────────────────────

-- Add a tsvector column for fast full-text search
alter table books
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(genre, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) stored;

-- GIN index for fast text search
create index if not exists books_search_idx on books using gin(search_vector);

-- Full-text search function (returns ranked results)
create or replace function search_books(query text, lim int default 20)
returns table (
  id              uuid,
  title           text,
  author          text,
  isbn            text,
  genre           text,
  cover_url       text,
  description     text,
  total_copies    int,
  available_copies int,
  featured        boolean,
  avg_rating      numeric,
  review_count    bigint,
  rank            real
) as $$
begin
  return query
  select
    b.id, b.title, b.author, b.isbn, b.genre, b.cover_url,
    b.description, b.total_copies, b.available_copies, b.featured,
    round(avg(r.rating), 1)   as avg_rating,
    count(distinct r.id)      as review_count,
    ts_rank(b.search_vector, websearch_to_tsquery('english', query)) as rank
  from books b
  left join reviews r on r.book_id = b.id and r.approved = true
  where b.search_vector @@ websearch_to_tsquery('english', query)
  group by b.id
  order by rank desc, b.available_copies desc
  limit lim;
end;
$$ language plpgsql stable;

-- ── 2. Activity feed view ─────────────────────────────────────────────────
-- Merges loans, reading_log updates, reviews, and discussion posts
-- into a single chronological feed per member

create or replace view member_activity_view as
  -- borrowed a book
  select
    l.member_id,
    'borrowed'        as type,
    b.title           as subject,
    b.id              as subject_id,
    'book'            as subject_type,
    l.borrowed_at     as created_at
  from loans l
  join books b on b.id = l.book_id

  union all

  -- returned a book
  select
    l.member_id,
    'returned'        as type,
    b.title           as subject,
    b.id              as subject_id,
    'book'            as subject_type,
    l.returned_at     as created_at
  from loans l
  join books b on b.id = l.book_id
  where l.returned_at is not null

  union all

  -- started reading
  select
    rl.member_id,
    'started_reading' as type,
    b.title           as subject,
    b.id              as subject_id,
    'book'            as subject_type,
    rl.started_at     as created_at
  from reading_log rl
  join books b on b.id = rl.book_id
  where rl.started_at is not null

  union all

  -- finished reading
  select
    rl.member_id,
    'finished_reading' as type,
    b.title            as subject,
    b.id               as subject_id,
    'book'             as subject_type,
    rl.finished_at     as created_at
  from reading_log rl
  join books b on b.id = rl.book_id
  where rl.finished_at is not null

  union all

  -- wrote a review
  select
    r.member_id,
    'reviewed'        as type,
    b.title           as subject,
    b.id              as subject_id,
    'book'            as subject_type,
    r.created_at
  from reviews r
  join books b on b.id = r.book_id
  where r.approved = true

  union all

  -- posted in discussion
  select
    dp.member_id,
    'posted'          as type,
    d.title           as subject,
    d.id              as subject_id,
    'discussion'      as subject_type,
    dp.created_at
  from discussion_posts dp
  join discussions d on d.id = dp.discussion_id
  where dp.approved = true and dp.parent_id is null;

-- ── 3. In-app notification bell ───────────────────────────────────────────
-- Reuse the notifications table but add an in-app flag and read status

alter table notifications
  add column if not exists in_app   boolean default false,
  add column if not exists read_at  timestamptz;

-- View: unread in-app notifications for a member
create or replace view unread_notifications_view as
select
  n.*,
  b.title   as book_title,
  b.cover_url
from notifications n
left join loans l on l.id = (
  -- try to associate with a loan if it's a loan-related notification
  select id from loans
  where member_id = n.member_id
  order by borrowed_at desc limit 1
)
left join books b on b.id = l.book_id
where n.in_app = true
  and n.read_at is null
order by n.created_at desc;

-- Function to mark all in-app notifications as read for a member
create or replace function mark_notifications_read(p_member_id uuid)
returns void as $$
begin
  update notifications
  set read_at = now()
  where member_id = p_member_id
    and in_app = true
    and read_at is null;
end;
$$ language plpgsql security definer;

-- Auto-create in-app notification when a waitlist slot opens
create or replace function create_inapp_waitlist_notification()
returns trigger as $$
begin
  insert into notifications (member_id, type, subject, body, in_app, sent)
  select
    new.member_id,
    'reservation_ready',
    'Your reserved book is available',
    'A book you reserved is now ready to borrow. Act within 48 hours.',
    true,
    false
  from books where id = new.book_id;
  return new;
end;
$$ language plpgsql;

create trigger waitlist_inapp_notify
  after insert on waitlist_notifications
  for each row execute function create_inapp_waitlist_notification();

-- Auto in-app when loan becomes overdue
create or replace function create_inapp_overdue_notification()
returns trigger as $$
begin
  if new.status = 'overdue' and old.status != 'overdue' then
    insert into notifications (member_id, type, subject, body, in_app, sent)
    values (
      new.member_id,
      'overdue',
      'You have an overdue book',
      'Please return it as soon as possible.',
      true,
      false
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger loan_overdue_inapp
  after update on loans
  for each row execute function create_inapp_overdue_notification();

-- ── 4. Admin analytics views ──────────────────────────────────────────────

-- Loans per month (last 12 months)
create or replace view loans_per_month as
select
  date_trunc('month', borrowed_at)  as month,
  count(*)                           as loan_count,
  count(distinct member_id)          as unique_borrowers
from loans
where borrowed_at >= now() - interval '12 months'
group by 1
order by 1;

-- Top borrowed books
create or replace view top_borrowed_books as
select
  b.id,
  b.title,
  b.author,
  b.genre,
  b.cover_url,
  count(l.id)               as borrow_count,
  count(distinct l.member_id) as unique_borrowers
from books b
join loans l on l.book_id = b.id
group by b.id, b.title, b.author, b.genre, b.cover_url
order by borrow_count desc
limit 20;

-- Member signups per month
create or replace view signups_per_month as
select
  date_trunc('month', joined_at) as month,
  count(*)                        as new_members
from members
where joined_at >= now() - interval '12 months'
group by 1
order by 1;

-- Genre popularity
create or replace view genre_popularity as
select
  b.genre,
  count(l.id)               as borrow_count,
  count(distinct b.id)      as book_count,
  round(avg(r.rating), 1)   as avg_rating
from books b
left join loans l on l.book_id = b.id
left join reviews r on r.book_id = b.id and r.approved = true
where b.genre is not null
group by b.genre
order by borrow_count desc;

-- ── 5. Similar books function ─────────────────────────────────────────────
-- Returns books in the same genre, ordered by rating, excluding the current book
create or replace function similar_books(p_book_id uuid, lim int default 4)
returns table (
  id              uuid,
  title           text,
  author          text,
  cover_url       text,
  genre           text,
  available_copies int,
  avg_rating      numeric,
  review_count    bigint
) as $$
begin
  return query
  select
    b.id, b.title, b.author, b.cover_url, b.genre, b.available_copies,
    round(avg(r.rating), 1) as avg_rating,
    count(r.id)             as review_count
  from books b
  left join reviews r on r.book_id = b.id and r.approved = true
  where b.genre = (select genre from books where id = p_book_id)
    and b.id != p_book_id
  group by b.id
  order by avg_rating desc nulls last, b.available_copies desc
  limit lim;
end;
$$ language plpgsql stable;
