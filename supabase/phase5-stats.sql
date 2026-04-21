-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5: Waitlist auto-notify · Leaderboard · Member stats · Achievements
-- Run in Supabase SQL Editor AFTER phases 1–4
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Waitlist notification queue ────────────────────────────────────────
-- When a book is returned and there are pending reservations,
-- we queue a notification for the next person in line.

create table waitlist_notifications (
  id            uuid primary key default uuid_generate_v4(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  book_id       uuid not null references books(id) on delete cascade,
  notified_at   timestamptz,
  expires_at    timestamptz,          -- member has 48h to borrow before next in queue
  status        text not null default 'pending'
                check (status in ('pending','notified','borrowed','expired')),
  created_at    timestamptz default now()
);

-- ── 2. Trigger: when a book is returned, notify the next reservation ───────
create or replace function notify_next_in_queue()
returns trigger as $$
declare
  next_reservation record;
begin
  -- Only fire when a loan is returned
  if new.status = 'returned' and old.status != 'returned' then

    -- Find oldest pending reservation for this book
    select r.*
    into next_reservation
    from reservations r
    where r.book_id = new.book_id
      and r.status = 'pending'
    order by r.reserved_at asc
    limit 1;

    if found then
      -- Queue a waitlist notification
      insert into waitlist_notifications
        (reservation_id, member_id, book_id, expires_at)
      values (
        next_reservation.id,
        next_reservation.member_id,
        new.book_id,
        now() + interval '48 hours'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger loans_notify_queue
  after update on loans
  for each row execute function notify_next_in_queue();

-- ── 3. Leaderboard views ───────────────────────────────────────────────────

-- Top readers by books finished
create or replace view leaderboard_books_read as
select
  m.id,
  m.full_name,
  m.membership_number,
  m.joined_at,
  count(rl.id)          as books_finished,
  count(distinct rl.books) as unique_books,
  max(rl.finished_at)   as last_finished_at
from members m
join reading_log rl on rl.member_id = m.id and rl.status = 'finished'
where m.status = 'active'
group by m.id, m.full_name, m.membership_number, m.joined_at
order by books_finished desc, last_finished_at asc;

-- Top reviewers
create or replace view leaderboard_reviewers as
select
  m.id,
  m.full_name,
  m.membership_number,
  count(r.id)           as review_count,
  round(avg(r.rating),1) as avg_rating_given,
  max(r.created_at)     as last_review_at
from members m
join reviews r on r.member_id = m.id and r.approved = true
where m.status = 'active'
group by m.id, m.full_name, m.membership_number
order by review_count desc;

-- Top discussion contributors
create or replace view leaderboard_contributors as
select
  m.id,
  m.full_name,
  m.membership_number,
  count(dp.id)                            as post_count,
  count(distinct dp.discussion_id)        as discussions_joined,
  sum(coalesce(pr_counts.like_count, 0))  as total_likes_received
from members m
join discussion_posts dp on dp.member_id = m.id and dp.approved = true
left join (
  select post_id, count(*) as like_count
  from post_reactions where reaction = 'like'
  group by post_id
) pr_counts on pr_counts.post_id = dp.id
where m.status = 'active'
group by m.id, m.full_name, m.membership_number
order by post_count desc;

-- Combined member stats (used on member stats page)
create or replace view member_stats_view as
select
  m.id                                    as member_id,
  m.full_name,
  m.membership_number,
  m.joined_at,
  -- Reading
  count(distinct case when rl.status = 'finished' then rl.id end)    as books_finished,
  count(distinct case when rl.status = 'reading'  then rl.id end)    as currently_reading,
  count(distinct rl.id)                                               as total_log_entries,
  coalesce(sum(case when rl.status = 'finished' then rl.pages_read end), 0) as total_pages_read,
  -- Loans
  count(distinct l.id)                    as total_loans,
  count(distinct case when l.status = 'active' then l.id end)        as active_loans,
  -- Reviews
  count(distinct r.id)                    as reviews_written,
  -- Club
  count(distinct dp.id)                   as discussion_posts,
  count(distinct dp.discussion_id)        as discussions_joined,
  -- Reservations
  count(distinct res.id)                  as total_reservations
from members m
left join reading_log    rl  on rl.member_id  = m.id
left join loans          l   on l.member_id   = m.id
left join reviews        r   on r.member_id   = m.id and r.approved = true
left join discussion_posts dp on dp.member_id = m.id and dp.approved = true
left join reservations   res on res.member_id = m.id
group by m.id, m.full_name, m.membership_number, m.joined_at;

-- ── 4. Achievements ────────────────────────────────────────────────────────
-- Computed server-side via the stats view; no extra table needed.
-- Achievements are derived in the frontend from member_stats_view.
-- Definition reference (used in frontend):
--
--  first_borrow   : total_loans >= 1
--  bookworm       : books_finished >= 5
--  avid_reader    : books_finished >= 20
--  century        : total_pages_read >= 10000
--  critic         : reviews_written >= 3
--  voice          : discussion_posts >= 10
--  conversationalist : discussions_joined >= 5
--  early_adopter  : joined_at < (select min(joined_at) + interval '30 days' from members)
--  loyal          : joined_at < now() - interval '1 year'

-- ── 5. Pending waitlist view ───────────────────────────────────────────────
create or replace view pending_waitlist_view as
select
  wn.*,
  m.full_name,
  m.email,
  b.title,
  b.author,
  b.available_copies,
  r.reserved_at
from waitlist_notifications wn
join members      m on m.id = wn.member_id
join books        b on b.id = wn.book_id
join reservations r on r.id = wn.reservation_id
where wn.status in ('pending', 'notified')
order by wn.created_at asc;

-- ── 6. RLS for new table ───────────────────────────────────────────────────
alter table waitlist_notifications enable row level security;

create policy "waitlist_member_own" on waitlist_notifications
  for select using (
    member_id in (select id from members where auth_user_id = auth.uid())
  );

create policy "waitlist_admin_all" on waitlist_notifications
  for all using (
    exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
  );

-- ── 7. Schedule: expire waitlist slots that weren't claimed ───────────────
-- Add to your pg_cron schedule (run once daily alongside due-reminders):
/*
select cron.schedule(
  'expire-waitlist-daily',
  '5 8 * * *',   -- 8:05am UTC, just after due-reminders
  $$
    update waitlist_notifications
    set status = 'expired'
    where status = 'notified'
      and expires_at < now();

    -- bump next person in queue for expired slots
    insert into waitlist_notifications (reservation_id, member_id, book_id, expires_at)
    select
      r.id,
      r.member_id,
      r.book_id,
      now() + interval '48 hours'
    from reservations r
    where r.status = 'pending'
      and r.book_id in (
        select book_id from waitlist_notifications where status = 'expired'
      )
      and r.id not in (
        select reservation_id from waitlist_notifications where status != 'expired'
      )
    order by r.reserved_at asc;
  $$
);
*/
