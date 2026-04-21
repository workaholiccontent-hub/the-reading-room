-- ─────────────────────────────────────────────────────────────────────────
-- Phase 4: Book Club
-- Run in Supabase SQL Editor AFTER phase 1 and phase 3 schemas
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Monthly book club picks
create table club_picks (
  id           uuid primary key default uuid_generate_v4(),
  book_id      uuid not null references books(id) on delete cascade,
  month        int  not null check (month between 1 and 12),
  year         int  not null,
  theme        text,                  -- optional theme/prompt for the month
  discussion_guide text,             -- optional admin-written guide shown to members
  active       boolean default false, -- only one active pick at a time
  created_at   timestamptz default now(),
  unique (month, year)
);

-- Only one pick can be active at once
create unique index club_picks_one_active on club_picks (active) where active = true;

-- 2. Discussion threads — one per club_pick, but also allow book-specific threads
create table discussions (
  id           uuid primary key default uuid_generate_v4(),
  club_pick_id uuid references club_picks(id) on delete cascade,
  book_id      uuid references books(id) on delete cascade,
  title        text not null,
  pinned       boolean default false,
  locked       boolean default false,  -- admin can lock to prevent new posts
  created_by   uuid references members(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger discussions_updated_at
  before update on discussions
  for each row execute function update_updated_at();

-- 3. Posts inside a discussion thread (supports replies)
create table discussion_posts (
  id            uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references discussions(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  parent_id     uuid references discussion_posts(id) on delete cascade, -- null = top-level
  body          text not null,
  edited        boolean default false,
  flagged       boolean default false,  -- member can flag for admin review
  approved      boolean default true,   -- admin can hide
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger discussion_posts_updated_at
  before update on discussion_posts
  for each row execute function update_updated_at();

-- 4. Post reactions (likes)
create table post_reactions (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references discussion_posts(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  reaction      text not null default 'like',
  created_at    timestamptz default now(),
  unique (post_id, member_id)
);

-- ── Views ─────────────────────────────────────────────────────────────────

-- Active club pick with book details
create or replace view active_club_pick_view as
select
  cp.*,
  b.title,
  b.author,
  b.cover_url,
  b.genre,
  b.description,
  b.isbn,
  b.available_copies,
  b.total_copies,
  round(avg(r.rating), 1)  as avg_rating,
  count(distinct r.id)     as review_count,
  count(distinct d.id)     as discussion_count
from club_picks cp
join books b on b.id = cp.book_id
left join reviews r on r.book_id = b.id and r.approved = true
left join discussions d on d.club_pick_id = cp.id
where cp.active = true
group by cp.id, b.id;

-- All club picks with book info (for archive)
create or replace view club_picks_view as
select
  cp.*,
  b.title,
  b.author,
  b.cover_url,
  b.genre,
  round(avg(r.rating), 1) as avg_rating,
  count(distinct r.id)    as review_count
from club_picks cp
join books b on b.id = cp.book_id
left join reviews r on r.book_id = b.id and r.approved = true
group by cp.id, b.id
order by cp.year desc, cp.month desc;

-- Discussion with post count and last activity
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

-- Posts with member info and reaction counts
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

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table club_picks        enable row level security;
alter table discussions       enable row level security;
alter table discussion_posts  enable row level security;
alter table post_reactions    enable row level security;

-- Club picks: anyone can read; only admins write
create policy "club_picks_public_read" on club_picks
  for select using (true);
create policy "club_picks_admin_write" on club_picks
  for all using (
    exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
  );

-- Discussions: active members can read; active members can create; admins manage
create policy "discussions_read" on discussions
  for select using (true);
create policy "discussions_member_create" on discussions
  for insert with check (
    exists (select 1 from members where auth_user_id = auth.uid() and status = 'active')
  );
create policy "discussions_admin_manage" on discussions
  for update using (
    exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
  );

-- Posts: approved posts are public; members manage their own; admins manage all
create policy "posts_public_read" on discussion_posts
  for select using (approved = true);
create policy "posts_member_insert" on discussion_posts
  for insert with check (
    exists (select 1 from members where auth_user_id = auth.uid() and status = 'active')
  );
create policy "posts_member_update_own" on discussion_posts
  for update using (
    member_id in (select id from members where auth_user_id = auth.uid())
  );
create policy "posts_admin_all" on discussion_posts
  for all using (
    exists (select 1 from members where auth_user_id = auth.uid() and role = 'admin')
  );

-- Reactions: any active member
create policy "reactions_read" on post_reactions
  for select using (true);
create policy "reactions_member" on post_reactions
  for all using (
    member_id in (select id from members where auth_user_id = auth.uid())
  );

-- ── Seed: create a discussion for the active pick automatically ───────────
create or replace function auto_create_discussion()
returns trigger as $$
declare
  admin_member_id uuid;
begin
  -- find first admin
  select id into admin_member_id from members where role = 'admin' limit 1;

  insert into discussions (club_pick_id, book_id, title, pinned, created_by)
  select
    new.id,
    new.book_id,
    'Monthly discussion — ' ||
      to_char(make_date(new.year, new.month, 1), 'Month YYYY'),
    true,
    admin_member_id;
  return new;
end;
$$ language plpgsql;

create trigger club_pick_auto_discussion
  after insert on club_picks
  for each row execute function auto_create_discussion();
