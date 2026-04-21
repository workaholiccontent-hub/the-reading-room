import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSendEmail, useDueReminders } from '@/hooks/useEmail'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Input, { Textarea, Select } from '@/components/ui/Input'
import StatCard from '@/components/ui/StatCard'
import styles from './AdminEmailPage.module.css'
import { format } from 'date-fns'

export default function AdminEmailPage() {
  const { sendBroadcast, loading: sending } = useSendEmail()
  const { runReminders, loading: scanning, result: reminderResult } = useDueReminders()

  const [tab, setTab]           = useState('compose')
  const [history, setHistory]   = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [memberCount, setMemberCount] = useState(0)

  // Compose form
  const [subject, setSubject]       = useState('')
  const [body, setBody]             = useState('')
  const [type, setType]             = useState('newsletter')
  const [audience, setAudience]     = useState('all')
  const [buttonText, setButtonText] = useState('')
  const [buttonUrl, setButtonUrl]   = useState('')
  const [preview, setPreview]       = useState(false)
  const [sent, setSent]             = useState(null)

  useEffect(() => {
    supabase.from('members').select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => setMemberCount(count || 0))

    if (tab === 'history') loadHistory()
  }, [tab])

  async function loadHistory() {
    setHistLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*, members(full_name)')
      .not('type', 'eq', 'due_reminder')
      .not('type', 'eq', 'overdue')
      .order('sent_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
    setHistLoading(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    const result = await sendBroadcast({
      type,
      subject: subject.trim(),
      body: body.trim(),
      memberIds: audience === 'all' ? undefined : [],
      buttonText: buttonText.trim() || undefined,
      buttonUrl:  buttonUrl.trim()  || undefined,
    })
    if (result) {
      setSent(result)
      setSubject('')
      setBody('')
      setButtonText('')
      setButtonUrl('')
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Email"
        subtitle="Send newsletters, reminders, and broadcasts to your members."
      />

      <div className={styles.stats}>
        <StatCard label="Active members" value={memberCount} sub="potential recipients" accent />
        {reminderResult && (
          <StatCard label="Last reminder run" value={reminderResult.sent} sub="emails sent" />
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: 'compose',   label: 'Compose' },
          { key: 'reminders', label: 'Due reminders' },
          { key: 'history',   label: 'Send history' },
        ].map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Compose ── */}
      {tab === 'compose' && (
        <div className={styles.composeWrap}>
          {sent ? (
            <div className={styles.sentBanner}>
              <div className={styles.sentIcon}>✓</div>
              <div>
                <p className={styles.sentTitle}>Email sent!</p>
                <p className={styles.sentSub}>
                  Delivered to {sent.sent} of {sent.total} active members.
                  {sent.errors?.length > 0 && ` ${sent.errors.length} failed.`}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSent(null)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className={styles.composeForm}>
              <div className={styles.formRow}>
                <Select
                  label="Email type"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  <option value="newsletter">Newsletter</option>
                  <option value="custom">Custom announcement</option>
                </Select>
                <Select
                  label="Send to"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                >
                  <option value="all">All active members ({memberCount})</option>
                </Select>
              </div>

              <Input
                label="Subject line"
                placeholder="What's this email about?"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />

              <Textarea
                label="Body"
                placeholder={`Write your message here.\n\nUse {{name}} to personalise with the member's first name.\n\nSeparate paragraphs with a blank line.`}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                required
              />

              <div className={styles.formRow}>
                <Input
                  label="Button text (optional)"
                  placeholder="e.g. Browse new books"
                  value={buttonText}
                  onChange={e => setButtonText(e.target.value)}
                />
                <Input
                  label="Button URL (optional)"
                  placeholder="https://…"
                  value={buttonUrl}
                  onChange={e => setButtonUrl(e.target.value)}
                />
              </div>

              {/* Live preview */}
              <div className={styles.previewToggle}>
                <button
                  type="button"
                  className={styles.previewBtn}
                  onClick={() => setPreview(!preview)}
                >
                  {preview ? 'Hide preview' : 'Show preview'}
                </button>
              </div>

              {preview && body && (
                <div className={styles.preview}>
                  <p className={styles.previewSubject}>{subject || '(no subject)'}</p>
                  {body.split('\n\n').filter(s => s.trim()).map((para, i) => (
                    <p key={i} className={styles.previewPara}>
                      {para.replace(/\{\{name\}\}/g, 'Reader')}
                    </p>
                  ))}
                  {buttonText && buttonUrl && (
                    <div className={styles.previewButton}>{buttonText}</div>
                  )}
                </div>
              )}

              <div className={styles.formActions}>
                <p className={styles.audienceNote}>
                  Will be sent to <strong>{memberCount}</strong> active members
                </p>
                <Button type="submit" variant="primary" loading={sending} disabled={!subject || !body}>
                  Send email
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Due reminders ── */}
      {tab === 'reminders' && (
        <div className={styles.remindersWrap}>
          <div className={styles.reminderCard}>
            <h2 className={styles.reminderTitle}>Automated due-date reminders</h2>
            <p className={styles.reminderDesc}>
              This scans all active loans and sends reminder emails to members whose books are due
              within 3 days, or became overdue today. Run this daily — or set up the cron schedule
              in Supabase to have it run automatically every morning.
            </p>

            <div className={styles.reminderInfo}>
              <div className={styles.reminderInfoItem}>
                <span className={styles.reminderLabel}>3-day reminder</span>
                <span className={styles.reminderVal}>Sent when due_date is 3 days away</span>
              </div>
              <div className={styles.reminderInfoItem}>
                <span className={styles.reminderLabel}>Overdue notice</span>
                <span className={styles.reminderVal}>Sent on day 1 of being overdue</span>
              </div>
              <div className={styles.reminderInfoItem}>
                <span className={styles.reminderLabel}>Grouping</span>
                <span className={styles.reminderVal}>One email per member, all books combined</span>
              </div>
            </div>

            {reminderResult && (
              <div className={styles.reminderResult}>
                <span className={styles.reminderResultSent}>
                  {reminderResult.sent} email{reminderResult.sent !== 1 ? 's' : ''} sent
                </span>
                {reminderResult.errors?.length > 0 && (
                  <span className={styles.reminderResultError}>
                    {reminderResult.errors.length} failed
                  </span>
                )}
              </div>
            )}

            <Button variant="primary" loading={scanning} onClick={runReminders}>
              Run reminders now
            </Button>

            <div className={styles.cronBox}>
              <p className={styles.cronTitle}>Auto-schedule with Supabase cron</p>
              <p className={styles.cronDesc}>
                In Supabase → Database → Extensions, enable <code>pg_cron</code>. Then in SQL Editor:
              </p>
              <pre className={styles.cronCode}>{`select cron.schedule(
  'due-reminders-daily',
  '0 8 * * *',  -- every day at 8am UTC
  $$
    select net.http_post(
      url := 'YOUR_SUPABASE_URL/functions/v1/due-reminders',
      headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div className={styles.historyWrap}>
          {histLoading ? (
            <p className={styles.loading}>Loading history…</p>
          ) : history.length === 0 ? (
            <div className={styles.empty}>No emails sent yet.</div>
          ) : (
            <div className={styles.histTable}>
              <div className={styles.histHead}>
                <span>Subject</span><span>Type</span><span>Member</span><span>Sent</span>
              </div>
              {history.map(n => (
                <div key={n.id} className={styles.histRow}>
                  <span className={styles.histSubject}>{n.subject}</span>
                  <span className={styles.histType}>{n.type}</span>
                  <span className={styles.histMuted}>{n.members?.full_name || 'All members'}</span>
                  <span className={styles.histMuted}>
                    {n.sent_at ? format(new Date(n.sent_at), 'd MMM yyyy, HH:mm') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
