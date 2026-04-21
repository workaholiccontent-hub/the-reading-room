-- ═══════════════════════════════════════════════════════════════════════════
-- THE READING ROOM — COMPLETE DATABASE SCHEMA
-- Run this entire file once in Supabase SQL Editor.
-- Covers all phases 1–6.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pg_net with schema extensions;

-- ── Helper: auto-update timestamps ───────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- PHASE 1 & 2: CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────

-- ── Members ──────────────────────────────────────────────────────────────
create table members (
  id                uuid primary key default uuid_generate_v4(),
  auth_user_id      uuid references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null unique,
  phone             text,
  membership_number text unique,
  status            text not null default 'pending'
                    check (status in ('pending','active','suspended','expired')),
  role              text not null default 'member'
                    check (role in ('member','admin')),
  joined_at         timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger members_updated_at
  before update on members
  for each row execute function update_updated_at();

create or replace function generate_membership_number()
returns trigger as $$
begin
  new.membership_number := 'MEM-' || lpad(
    (select coalesce(max(split_part(membership_number,'-',2)::int),0)+1
     from members)::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger members_membership_number
  before insert on members
  for each row execute function generate_membership_number();

-- ── Books ─────────────────────────────────────────────────────────────────
create table books (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  author           text not null,
  isbn             text unique,
  genre            text,
  cover_url        text,
  description      text,
  total_copies     int  not null default 1,
  available_copies int  not null default 1,
  featured         boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint copies_valid check (available_copies >= 0
                                  and available_copies <= total_copies)
);

create trigger books_updated_at
  before update on books
  for each row execute function update_updated_at();

-- ── Loans ─────────────────────────────────────────────────────────────────
create table loans (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,
  borrowed_at timestamptz default now(),
  due_date    timestamptz not null,
  returned_at timestamptz,
  status      text not null default 'active'
              check (status in ('active','returned','overdue')),
  created_at  timestamptz default now()
);

create or replace function loan_decrement_copies()
returns trigger as $$
begin
  update books set available_copies = available_copies - 1
  where id = new.book_id;
  return new;
end;
$$ language plpgsql;

create trigger loans_after_insert
  after insert on loans
  for each row execute function loan_decrement_copies();

create or replace function loan_increment_copies()
returns trigger as $$
begin
  if new.returned_at is not null and old.returned_at is null then
    update books set available_copies = available_copies + 1
    where id = new.book_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger loans_after_return
  after update on loans
  for each row execute function loan_increment_copies();

-- ── Reservations ─────────────────────────────────────────────────────────
create table reservations (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,
  reserved_at timestamptz default now(),
  status      text not null default 'pending'
              check (status in ('pending','fulfilled','cancelled')),
  notes       text
);

-- ── Reading log ───────────────────────────────────────────────────────────
create table reading_log (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,
  pages_read  int default 0,
  total_pages int,
  started_at  timestamptz,
  finished_at timestamptz,
  status      text not null default 'reading'
              check (status in ('want_to_read','reading','finished','abandoned')),
  updated_at  timestamptz default now(),
  unique (member_id, book_id)
);

create trigger reading_log_updated_at
  before update on reading_log
  for each row execute function update_updated_at();

-- ── Reviews ───────────────────────────────────────────────────────────────
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,
  rating      int check (rating between 1 and 5),
  body        text,
  approved    boolean default false,
  created_at  timestamptz default now(),
  unique (member_id, book_id)
);

-- ── Notifications ─────────────────────────────────────────────────────────
create table notifications (
  id           uuid primary key default uuid_generate_v4(),
  member_id    uuid references members(id) on delete cascade,
  type         text not null
               check (type in ('due_reminder','overdue','newsletter',
                               'reservation_ready','welcome','custom')),
  subject      text not null,
  body         text not null,
  sent         boolean default false,
  scheduled_at timestamptz,
  sent_at      timestamptz,
  in_app       boolean default false,
  read_at      timestamptz,
  created_at   timestamptz default now()
);

-- ── Correspondences ───────────────────────────────────────────────────────
create table correspondences (
  id           uuid primary key default uuid_generate_v4(),
  member_id    uuid not null references members(id) on delete cascade,
  book_id      uuid not null references books(id) on delete cascade,
  prompt_type  text not null
               check (prompt_type in ('check_in','discussion_question',
                                      'fun_fact','author_note','custom')),
  content      text not null,
  sent         boolean default false,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- PHASE 4: BOOK CLUB
-- ─────────────────────────────────────────────────────────────────────────

create table club_picks (
  id               uuid primary key default uuid_generate_v4(),
  book_id          uuid not null references books(id) on delete cascade,
  month            int  not null check (month between 1 and 12),
  year             int  not null,
  theme            text,
  discussion_guide text,
  active           boolean default false,
  created_at       timestamptz default now(),
  unique (month, year)
);

create unique index club_picks_one_active on club_picks (active) where active = true;

create table discussions (
  id           uuid primary key default uuid_generate_v4(),
  club_pick_id uuid references club_picks(id) on delete cascade,
  book_id      uuid references books(id) on delete cascade,
  title        text not null,
  pinned       boolean default false,
  locked       boolean default false,
  created_by   uuid references members(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger discussions_updated_at
  before update on discussions
  for each row execute function update_updated_at();

create table discussion_posts (
  id            uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references discussions(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  parent_id     uuid references discussion_posts(id) on delete cascade,
  body          text not null,
  edited        boolean default false,
  flagged       boolean default false,
  approved      boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger discussion_posts_updated_at
  before update on discussion_posts
  for each row execute function update_updated_at();

create table post_reactions (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references discussion_posts(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  reaction   text not null default 'like',
  created_at timestamptz default now(),
  unique (post_id, member_id)
);

create or replace function auto_create_discussion()
returns trigger as $$
begin
  insert into discussions (club_pick_id, book_id, title, pinned, created_by)
  values (
    new.id,
    new.book_id,
    'Monthly discussion — ' || to_char(make_date(new.year, new.month, 1), 'Month YYYY'),
    true,
    (select id from members where role = 'admin' order by joined_at asc limit 1)
  );
  return new;
end;
$$ language plpgsql;

create trigger club_pick_auto_discussion
  after insert on club_picks
  for each row execute function auto_create_discussion();

-- ─────────────────────────────────────────────────────────────────────────
-- PHASE 5: WAITLIST
-- ─────────────────────────────────────────────────────────────────────────

create table waitlist_notifications (
  id             uuid primary key default uuid_generate_v4(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,
  book_id        uuid not null references books(id) on delete cascade,
  notified_at    timestamptz,
  expires_at     timestamptz,
  status         text not null default 'pending'
                 check (status in ('pending','notified','borrowed','expired')),
  created_at     timestamptz default now()
);

create or replace function notify_next_in_queue()
returns trigger as $$
declare
  next_reservation record;
begin
  if new.status = 'returned' and old.status != 'returned' then
    select r.* into next_reservation
    from reservations r
    where r.book_id = new.book_id and r.status = 'pending'
    order by r.reserved_at asc limit 1;
    if found then
      insert into waitlist_notifications (reservation_id, member_id, book_id, expires_at)
      values (next_reservation.id, next_reservation.member_id, new.book_id, now() + interval '48 hours');
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger loans_notify_queue
  after update on loans
  for each row execute function notify_next_in_queue();

-- In-app notification when waitlist slot opens
create or replace function create_inapp_waitlist_notification()
returns trigger as $$
begin
  insert into notifications (member_id, type, subject, body, in_app, sent)
  select new.member_id, 'reservation_ready',
    'Your reserved book is available',
    'A book you reserved is now ready to borrow. Act within 48 hours.',
    true, false
  from books where id = new.book_id;
  return new;
end;
$$ language plpgsql;

create trigger waitlist_inapp_notify
  after insert on waitlist_notifications
  for each row execute function create_inapp_waitlist_notification();

-- In-app notification when loan goes overdue
create or replace function create_inapp_overdue_notification()
returns trigger as $$
begin
  if new.status = 'overdue' and old.status != 'overdue' then
    insert into notifications (member_id, type, subject, body, in_app, sent)
    values (new.member_id, 'overdue', 'You have an overdue book',
            'Please return it as soon as possible.', true, false);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger loan_overdue_inapp
  after update on loans
  for each row execute function create_inapp_overdue_notification();

-- ─────────────────────────────────────────────────────────────────────────
-- PHASE 6: FULL-TEXT SEARCH, ANALYTICS
-- ─────────────────────────────────────────────────────────────────────────

alter table books
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(genre, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) stored;

create index if not exists books_search_idx on books using gin(search_vector);

create or replace function search_books(query text, lim int default 20)
returns table (
  id uuid, title text, author text, isbn text, genre text,
  cover_url text, description text, total_copies int,
  available_copies int, featured boolean,
  avg_rating numeric, review_count bigint, rank real
) as $$
begin
  return query
  select
    b.id, b.title, b.author, b.isbn, b.genre, b.cover_url,
    b.description, b.total_copies, b.available_copies, b.featured,
    round(avg(r.rating), 1) as avg_rating,
    count(distinct r.id)    as review_count,
    ts_rank(b.search_vector, websearch_to_tsquery('english', query)) as rank
  from books b
  left join reviews r on r.book_id = b.id and r.approved = true
  where b.search_vector @@ websearch_to_tsquery('english', query)
  group by b.id
  order by rank desc, b.available_copies desc
  limit lim;
end;
$$ language plpgsql stable;

create or replace function similar_books(p_book_id uuid, lim int default 4)
returns table (
  id uuid, title text, author text, cover_url text, genre text,
  available_copies int, avg_rating numeric, review_count bigint
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

-- Mark all notifications read for a member
create or replace function mark_notifications_read(p_member_id uuid)
returns void as $$
begin
  update notifications
  set read_at = now()
  where member_id = p_member_id and in_app = true and read_at is null;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────────────────

-- Book catalogue with average rating
create or replace view catalogue_view as
select
  b.*,
  round(avg(r.rating), 1) as avg_rating,
  count(r.id)             as review_count
from books b
left join reviews r on r.book_id = b.id and r.approved = true
group by b.id;

-- Active loans with days remaining
create or replace view active_loans_view as
select
  l.id, l.member_id, m.full_name, m.email,
  l.book_id, b.title, b.author,
  l.borrowed_at, l.due_date,
  date_part('day', l.due_date - now()) as days_remaining,
  l.status
from loans l
join members m on m.id = l.member_id
join books   b on b.id = l.book_id
where l.returned_at is null;

-- Active club pick
create or replace view active_club_pick_view as
select
  cp.*,
  b.title, b.author, b.cover_url, b.genre,
  b.description, b.isbn, b.available_copies, b.total_copies,
  round(avg(r.rating), 1) as avg_rating,
  count(distinct r.id)    as review_count,
  count(distinct d.id)    as discussion_count
from club_picks cp
join books b on b.id = cp.book_id
left join reviews r     on r.book_id = b.id and r.approved = true
left join discussions d on d.club_pick_id = cp.id
where cp.active = true
group by cp.id, b.id;

-- All club picks (archive)
create or replace view club_picks_view as
select
  cp.*,
  b.title, b.author, b.cover_url, b.genre,
  round(avg(r.rating), 1) as avg_rating,
  count(distinct r.id)    as review_count
from club_picks cp
join books b on b.id = cp.book_id
left join reviews r on r.book_id = b.id and r.approved = true
group by cp.id, b.id
order by cp.year desc, cp.month desc;

-- Discussions with post count
create or replace view discussions_view as
select
  d.*,
  m.full_name           as created_by_name,
  count(dp.id)          as post_count,
  max(dp.created_at)    as last_post_at,
  b.title               as book_title,
  b.author              as book_author,
  cp.month              as pick_month,
  cp.year               as pick_year
from discussions d
left join members m  on m.id  = d.created_by
left join discussion_posts dp on dp.discussion_id = d.id and dp.approved = true
left join books b    on b.id  = d.book_id
left join club_picks cp on cp.id = d.club_pick_id
group by d.id, m.full_name, b.title, b.author, cp.month, cp.year
order by d.pinned desc, last_post_at desc nulls last;

-- Posts with member info and likes
create or replace view discussion_posts_view as
select
  dp.*,
  m.full_name,
  m.membership_number,
  count(pr.id) as like_count
from discussion_posts dp
join members m on m.id = dp.member_id
left join post_reactions pr on pr.post_id = dp.id and pr.reaction = 'like'
where dp.approved = true
group by dp.id, m.full_name, m.membership_number
order by dp.created_at asc;

-- Currently reading (for correspondence)
create or replace view currently_reading_view as
select
  rl.id as log_id, rl.member_id,
  m.full_name, m.email, m.membership_number, m.status as member_status,
  rl.book_id, b.title, b.author, b.genre, b.cover_url,
  rl.pages_read, rl.total_pages,
  case when rl.total_pages > 0
    then round((rl.pages_read::numeric / rl.total_pages) * 100, 1)
    else null end as pct_complete,
  rl.started_at, rl.updated_at
from reading_log rl
join members m on m.id = rl.member_id
join books   b on b.id = rl.book_id
where rl.status = 'reading' and m.status = 'active';

-- Pending waitlist
create or replace view pending_waitlist_view as
select
  wn.*, m.full_name, m.email,
  b.title, b.author, b.available_copies,
  r.reserved_at
from waitlist_notifications wn
join members      m on m.id = wn.member_id
join books        b on b.id = wn.book_id
join reservations r on r.id = wn.reservation_id
where wn.status in ('pending','notified')
order by wn.created_at asc;

-- Leaderboards
create or replace view leaderboard_books_read as
select
  m.id, m.full_name, m.membership_number, m.joined_at,
  count(rl.id)        as books_finished,
  max(rl.finished_at) as last_finished_at
from members m
join reading_log rl on rl.member_id = m.id and rl.status = 'finished'
where m.status = 'active'
group by m.id, m.full_name, m.membership_number, m.joined_at
order by books_finished desc;

create or replace view leaderboard_reviewers as
select
  m.id, m.full_name, m.membership_number,
  count(r.id)             as review_count,
  round(avg(r.rating), 1) as avg_rating_given,
  max(r.created_at)       as last_review_at
from members m
join reviews r on r.member_id = m.id and r.approved = true
where m.status = 'active'
group by m.id, m.full_name, m.membership_number
order by review_count desc;

create or replace view leaderboard_contributors as
select
  m.id, m.full_name, m.membership_number,
  count(dp.id)                          as post_count,
  count(distinct dp.discussion_id)      as discussions_joined,
  sum(coalesce(pr_c.like_count, 0))     as total_likes_received
from members m
join discussion_posts dp on dp.member_id = m.id and dp.approved = true
left join (
  select post_id, count(*) as like_count
  from post_reactions where reaction = 'like' group by post_id
) pr_c on pr_c.post_id = dp.id
where m.status = 'active'
group by m.id, m.full_name, m.membership_number
order by post_count desc;

-- Member stats
create or replace view member_stats_view as
select
  m.id as member_id, m.full_name, m.membership_number, m.joined_at,
  count(distinct case when rl.status = 'finished'     then rl.id end) as books_finished,
  count(distinct case when rl.status = 'reading'      then rl.id end) as currently_reading,
  count(distinct rl.id)                                                as total_log_entries,
  coalesce(sum(case when rl.status = 'finished' then rl.pages_read end), 0) as total_pages_read,
  count(distinct l.id)                                                 as total_loans,
  count(distinct case when l.status = 'active'        then l.id end)  as active_loans,
  count(distinct r.id)                                                 as reviews_written,
  count(distinct dp.id)                                                as discussion_posts,
  count(distinct dp.discussion_id)                                     as discussions_joined,
  count(distinct res.id)                                               as total_reservations
from members m
left join reading_log     rl  on rl.member_id  = m.id
left join loans           l   on l.member_id   = m.id
left join reviews         r   on r.member_id   = m.id and r.approved = true
left join discussion_posts dp on dp.member_id  = m.id and dp.approved = true
left join reservations    res on res.member_id = m.id
group by m.id, m.full_name, m.membership_number, m.joined_at;

-- Activity feed
create or replace view member_activity_view as
  select l.member_id, 'borrowed' as type, b.title as subject,
         b.id as subject_id, 'book' as subject_type, l.borrowed_at as created_at
  from loans l join books b on b.id = l.book_id
  union all
  select l.member_id, 'returned', b.title, b.id, 'book', l.returned_at
  from loans l join books b on b.id = l.book_id where l.returned_at is not null
  union all
  select rl.member_id, 'started_reading', b.title, b.id, 'book', rl.started_at
  from reading_log rl join books b on b.id = rl.book_id where rl.started_at is not null
  union all
  select rl.member_id, 'finished_reading', b.title, b.id, 'book', rl.finished_at
  from reading_log rl join books b on b.id = rl.book_id where rl.finished_at is not null
  union all
  select r.member_id, 'reviewed', b.title, b.id, 'book', r.created_at
  from reviews r join books b on b.id = r.book_id where r.approved = true
  union all
  select dp.member_id, 'posted', d.title, d.id, 'discussion', dp.created_at
  from discussion_posts dp join discussions d on d.id = dp.discussion_id
  where dp.approved = true and dp.parent_id is null;

-- Analytics views
create or replace view loans_per_month as
select date_trunc('month', borrowed_at) as month,
       count(*) as loan_count, count(distinct member_id) as unique_borrowers
from loans where borrowed_at >= now() - interval '12 months'
group by 1 order by 1;

create or replace view signups_per_month as
select date_trunc('month', joined_at) as month, count(*) as new_members
from members where joined_at >= now() - interval '12 months'
group by 1 order by 1;

create or replace view top_borrowed_books as
select b.id, b.title, b.author, b.genre, b.cover_url,
       count(l.id) as borrow_count, count(distinct l.member_id) as unique_borrowers
from books b join loans l on l.book_id = b.id
group by b.id order by borrow_count desc limit 20;

create or replace view genre_popularity as
select b.genre, count(l.id) as borrow_count, count(distinct b.id) as book_count,
       round(avg(r.rating), 1) as avg_rating
from books b
left join loans l on l.book_id = b.id
left join reviews r on r.book_id = b.id and r.approved = true
where b.genre is not null
group by b.genre order by borrow_count desc;

-- ─────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────

alter table members            enable row level security;
alter table books              enable row level security;
alter table loans              enable row level security;
alter table reservations       enable row level security;
alter table reading_log        enable row level security;
alter table reviews            enable row level security;
alter table notifications      enable row level security;
alter table correspondences    enable row level security;
alter table club_picks         enable row level security;
alter table discussions        enable row level security;
alter table discussion_posts   enable row level security;
alter table post_reactions     enable row level security;
alter table waitlist_notifications enable row level security;

-- Books: public read, admin write
create policy "books_public_read" on books for select using (true);
create policy "books_admin_write" on books for all using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Members: own row + admins see all
create policy "members_own_row" on members for select using (
  auth_user_id = auth.uid() or
  exists (select 1 from members m where m.auth_user_id = auth.uid() and m.role = 'admin')
);
create policy "members_insert" on members for insert with check (true);
create policy "members_own_update" on members for update using (auth_user_id = auth.uid());
create policy "members_admin_update" on members for update using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Loans, reservations, reading_log: own + admin
create policy "loans_member_or_admin" on loans for all using (
  member_id in (select id from members where auth_user_id = auth.uid()) or
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);
create policy "reservations_member_or_admin" on reservations for all using (
  member_id in (select id from members where auth_user_id = auth.uid()) or
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);
create policy "reading_log_member_or_admin" on reading_log for all using (
  member_id in (select id from members where auth_user_id = auth.uid()) or
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Reviews: approved ones are public; member owns their own; admins all
create policy "reviews_public_approved" on reviews for select using (approved = true);
create policy "reviews_own" on reviews for all using (
  member_id in (select id from members where auth_user_id = auth.uid())
);
create policy "reviews_admin" on reviews for all using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Notifications & correspondences: own + admin
create policy "notifications_member_or_admin" on notifications for all using (
  member_id in (select id from members where auth_user_id = auth.uid()) or
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);
create policy "correspondences_member_or_admin" on correspondences for all using (
  member_id in (select id from members where auth_user_id = auth.uid()) or
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Club: public read, admin write
create policy "club_picks_public_read" on club_picks for select using (true);
create policy "club_picks_admin_write" on club_picks for all using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Discussions: public read, active members create, admins manage
create policy "discussions_read" on discussions for select using (true);
create policy "discussions_member_create" on discussions for insert with check (
  exists (select 1 from members where auth_user_id = auth.uid() and status = 'active')
);
create policy "discussions_admin_manage" on discussions for update using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Posts: approved public, members own, admins all
create policy "posts_public_read" on discussion_posts for select using (approved = true);
create policy "posts_member_insert" on discussion_posts for insert with check (
  exists (select 1 from members where auth_user_id = auth.uid() and status = 'active')
);
create policy "posts_member_update_own" on discussion_posts for update using (
  member_id in (select id from members where auth_user_id = auth.uid())
);
create policy "posts_admin_all" on discussion_posts for all using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);

-- Reactions
create policy "reactions_read" on post_reactions for select using (true);
create policy "reactions_member" on post_reactions for all using (
  member_id in (select id from members where auth_user_id = auth.uid())
);

-- Waitlist: own + admin
create policy "waitlist_member_own" on waitlist_notifications for select using (
  member_id in (select id from members where auth_user_id = auth.uid())
);
create policy "waitlist_admin_all" on waitlist_notifications for all using (
  exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
);
