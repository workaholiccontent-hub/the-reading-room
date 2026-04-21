-- ─────────────────────────────────────────────────────────
-- Phase 3: Email & Correspondence additions
-- Run this in Supabase SQL Editor AFTER the Phase 1 schema
-- ─────────────────────────────────────────────────────────

-- 1. Enable pg_net extension (used for HTTP requests in cron)
create extension if not exists pg_net with schema extensions;

-- 2. Enable pg_cron extension (for scheduled jobs)
-- NOTE: pg_cron must be enabled from Supabase Dashboard:
--   Database → Extensions → search "pg_cron" → enable
-- Then run the schedule command below.

-- 3. Add a view to easily see who is currently reading what
create or replace view currently_reading_view as
select
  rl.id                 as log_id,
  rl.member_id,
  m.full_name,
  m.email,
  m.membership_number,
  m.status              as member_status,
  rl.book_id,
  b.title,
  b.author,
  b.genre,
  b.cover_url,
  rl.pages_read,
  rl.total_pages,
  case
    when rl.total_pages > 0
    then round((rl.pages_read::numeric / rl.total_pages) * 100, 1)
    else null
  end                   as pct_complete,
  rl.started_at,
  rl.updated_at
from reading_log rl
join members m on m.id = rl.member_id
join books   b on b.id = rl.book_id
where rl.status = 'reading'
  and m.status  = 'active';

-- 4. Add a notifications summary view for admin email history
create or replace view notification_history_view as
select
  n.*,
  m.full_name,
  m.email
from notifications n
left join members m on m.id = n.member_id
order by n.created_at desc;

-- 5. Cron job — run due reminders every day at 8am UTC
-- Uncomment and replace YOUR_SUPABASE_URL and YOUR_ANON_KEY once
-- you have deployed the edge function:
/*
select cron.schedule(
  'due-reminders-daily',
  '0 8 * * *',
  $$
    select
      net.http_post(
        url     := 'YOUR_SUPABASE_URL/functions/v1/due-reminders',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer YOUR_ANON_KEY'
        ),
        body    := '{}'::jsonb
      )
  $$
);
*/

-- 6. Grant access to new views (same RLS pattern as other tables)
-- currently_reading_view: admins can see all, members see nothing directly
-- (it's only used in admin edge functions and admin UI)
