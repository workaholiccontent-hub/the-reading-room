import { useState } from 'react'
import { useWaitlist } from '@/hooks/useStats'
import { useSendEmail } from '@/hooks/useEmail'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import StatCard from '@/components/ui/StatCard'
import toast from 'react-hot-toast'
import styles from './AdminWaitlistPage.module.css'
import { format, formatDistanceToNow } from 'date-fns'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function runWaitlistNotify() {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}/waitlist-notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  })
  return res.json()
}

export default function AdminWaitlistPage() {
  const { items, loading, refetch } = useWaitlist()
  const [running, setRunning]       = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const pending   = items.filter(i => i.status === 'pending')
  const notified  = items.filter(i => i.status === 'notified')

  async function handleRunNotify() {
    setRunning(true)
    try {
      const result = await runWaitlistNotify()
      setLastResult(result)
      toast.success(`Sent ${result.sent} waitlist notification${result.sent !== 1 ? 's' : ''}`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleExpire(id) {
    await supabase.from('waitlist_notifications').update({ status: 'expired' }).eq('id', id)
    toast.success('Marked as expired.')
    refetch()
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Waitlist"
        subtitle="Reservation queue — members waiting for unavailable books."
        action={
          <Button variant="primary" loading={running} onClick={handleRunNotify}>
            Run notifications
          </Button>
        }
      />

      <div className={styles.statsRow}>
        <StatCard label="Pending notification" value={pending.length}  sub="not yet emailed" accent />
        <StatCard label="Notified"             value={notified.length} sub="awaiting borrow" />
        <StatCard label="Total in queue"       value={items.length}    sub="across all books" />
      </div>

      {lastResult && (
        <div className={styles.resultBanner}>
          <span>Last run: <strong>{lastResult.sent}</strong> email{lastResult.sent !== 1 ? 's' : ''} sent</span>
          {lastResult.errors?.length > 0 && (
            <span className={styles.resultErrors}>{lastResult.errors.length} failed</span>
          )}
        </div>
      )}

      {/* How it works */}
      <div className={styles.howItWorks}>
        <p className={styles.howTitle}>How the waitlist works</p>
        <p className={styles.howBody}>
          When a loan is returned, the database trigger automatically adds the next person
          in the reservation queue to the waitlist. Click <strong>Run notifications</strong> to email all
          pending entries. Members have <strong>48 hours</strong> to borrow the book before their slot expires
          and the next person is notified. Add the cron job to automate this daily.
        </p>
      </div>

      {/* Queue table */}
      {loading ? (
        <p className={styles.loading}>Loading queue…</p>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          No active waitlist items. The queue is clear.
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Member</span>
            <span>Book</span>
            <span>Status</span>
            <span>Created</span>
            <span>Expires</span>
            <span>Action</span>
          </div>
          {items.map(item => {
            const expired  = new Date(item.expires_at) < new Date()
            const timeLeft = !expired
              ? formatDistanceToNow(new Date(item.expires_at), { addSuffix: true })
              : 'expired'

            return (
              <div key={item.id} className={`${styles.tableRow} ${expired ? styles.expiredRow : ''}`}>
                <div className={styles.cellStack}>
                  <span className={styles.cellPrimary}>{item.full_name}</span>
                  <span className={styles.cellMuted}>{item.email}</span>
                </div>
                <div className={styles.cellStack}>
                  <span className={styles.cellPrimary}>{item.title}</span>
                  <span className={styles.cellMuted}>{item.author}</span>
                </div>
                <span>
                  <span className={`${styles.statusPill} ${styles[item.status]}`}>
                    {item.status}
                  </span>
                </span>
                <span className={styles.cellMuted}>
                  {format(new Date(item.created_at), 'd MMM yyyy')}
                </span>
                <span className={`${styles.cellMuted} ${expired ? styles.expiredText : ''}`}>
                  {timeLeft}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExpire(item.id)}
                >
                  Expire
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Cron setup */}
      <div className={styles.cronCard}>
        <p className={styles.cronTitle}>Automate with pg_cron</p>
        <p className={styles.cronDesc}>
          Add this alongside your existing due-reminders cron job in Supabase SQL Editor:
        </p>
        <pre className={styles.cronCode}>{`select cron.schedule(
  'waitlist-notify-daily',
  '10 8 * * *',  -- 8:10am UTC daily
  $$
    select net.http_post(
      url := 'YOUR_SUPABASE_URL/functions/v1/waitlist-notify',
      headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);`}</pre>
      </div>
    </div>
  )
}
