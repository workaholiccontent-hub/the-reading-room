import { useState, useEffect } from 'react'
import { useClubAdmin, useDiscussions, usePosts } from '@/hooks/useClub'
import { useBooks } from '@/hooks/useBooks'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import StatCard from '@/components/ui/StatCard'
import styles from './AdminClubPage.module.css'
import { format } from 'date-fns'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

export default function AdminClubPage() {
  const { picks, loading, setPick, archivePick, toggleLock, hidePost, approvePost, refetch }
    = useClubAdmin()
  const { books } = useBooks({ limit: 300 })

  const [tab, setTab]             = useState('pick')
  const [pickModalOpen, setPickModalOpen] = useState(false)
  const [flaggedPosts, setFlaggedPosts]   = useState([])
  const [flagLoading, setFlagLoading]     = useState(false)
  const [stats, setStats]         = useState({})

  // Pick form
  const now = new Date()
  const [bookId, setBookId]       = useState('')
  const [month, setMonth]         = useState(now.getMonth() + 1)
  const [year, setYear]           = useState(now.getFullYear())
  const [theme, setTheme]         = useState('')
  const [guide, setGuide]         = useState('')
  const [saving, setSaving]       = useState(false)

  const activePick = picks.find(p => p.active)

  useEffect(() => {
    if (tab === 'moderate') loadFlagged()
    loadStats()
  }, [tab])

  async function loadFlagged() {
    setFlagLoading(true)
    const { data } = await supabase
      .from('discussion_posts')
      .select('*, members(full_name), discussions(title)')
      .eq('flagged', true)
      .eq('approved', true)
      .order('created_at', { ascending: false })
    setFlaggedPosts(data || [])
    setFlagLoading(false)
  }

  async function loadStats() {
    const [
      { count: totalPicks },
      { count: totalDiscussions },
      { count: totalPosts },
    ] = await Promise.all([
      supabase.from('club_picks').select('*', { count: 'exact', head: true }),
      supabase.from('discussions').select('*', { count: 'exact', head: true }),
      supabase.from('discussion_posts').select('*', { count: 'exact', head: true }).eq('approved', true),
    ])
    setStats({ totalPicks, totalDiscussions, totalPosts })
  }

  async function handleSetPick(e) {
    e.preventDefault()
    setSaving(true)
    const ok = await setPick(bookId, month, year, theme, guide)
    setSaving(false)
    if (ok) {
      setPickModalOpen(false)
      setBookId(''); setTheme(''); setGuide('')
    }
  }

  function openEdit(pick) {
    setBookId(pick.book_id)
    setMonth(pick.month)
    setYear(pick.year)
    setTheme(pick.theme || '')
    setGuide(pick.discussion_guide || '')
    setPickModalOpen(true)
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Book Club"
        subtitle="Manage monthly picks, discussions, and moderation."
        action={<Button variant="primary" onClick={() => { setBookId(''); setTheme(''); setGuide(''); setPickModalOpen(true) }}>Set new pick</Button>}
      />

      <div className={styles.statsRow}>
        <StatCard label="Total picks"       value={stats.totalPicks ?? '—'}       accent />
        <StatCard label="Discussions"       value={stats.totalDiscussions ?? '—'} />
        <StatCard label="Posts"             value={stats.totalPosts ?? '—'}       />
        <StatCard label="Flagged posts"     value={flaggedPosts.length}
          sub={flaggedPosts.length > 0 ? 'need review' : 'all clear'} />
      </div>

      <div className={styles.tabs}>
        {[
          { key: 'pick',     label: 'Monthly picks' },
          { key: 'threads',  label: 'Discussions' },
          { key: 'moderate', label: `Flagged posts${flaggedPosts.length > 0 ? ` (${flaggedPosts.length})` : ''}` },
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

      {/* ── Monthly picks ── */}
      {tab === 'pick' && (
        loading ? <p className={styles.loading}>Loading…</p> : (
          <div className={styles.picksGrid}>
            {picks.length === 0 ? (
              <div className={styles.empty}>No picks yet. Set your first one!</div>
            ) : picks.map(p => (
              <div key={p.id} className={`${styles.pickCard} ${p.active ? styles.pickActive : ''}`}>
                {p.active && <span className={styles.activeBadge}>Active</span>}
                <div className={styles.pickCover}>
                  {p.cover_url
                    ? <img src={p.cover_url} alt={p.title} />
                    : <div className={styles.coverPlaceholder}>{p.title?.charAt(0)}</div>
                  }
                </div>
                <div className={styles.pickInfo}>
                  <span className={styles.pickMonth}>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </span>
                  <p className={styles.pickTitle}>{p.title}</p>
                  <p className={styles.pickAuthor}>{p.author}</p>
                  {p.theme && <p className={styles.pickTheme}>{p.theme}</p>}
                  {p.avg_rating && (
                    <p className={styles.pickRating}>★ {Number(p.avg_rating).toFixed(1)} · {p.review_count} reviews</p>
                  )}
                </div>
                <div className={styles.pickCardActions}>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                  {p.active && (
                    <Button size="sm" variant="danger" onClick={() => archivePick(p.id)}>Archive</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Discussions ── */}
      {tab === 'threads' && (
        <DiscussionsAdmin
          activePick={activePick}
          toggleLock={toggleLock}
        />
      )}

      {/* ── Moderation ── */}
      {tab === 'moderate' && (
        <div className={styles.moderateWrap}>
          {flagLoading ? (
            <p className={styles.loading}>Loading flagged posts…</p>
          ) : flaggedPosts.length === 0 ? (
            <div className={styles.empty}>
              No flagged posts. All clear!
            </div>
          ) : (
            <div className={styles.flaggedList}>
              {flaggedPosts.map(post => (
                <FlaggedPostCard
                  key={post.id}
                  post={post}
                  onHide={async () => { await hidePost(post.id); loadFlagged() }}
                  onApprove={async () => { await approvePost(post.id); loadFlagged() }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Set pick modal */}
      <Modal
        open={pickModalOpen}
        onClose={() => setPickModalOpen(false)}
        title="Set monthly pick"
        maxWidth={560}
      >
        <form onSubmit={handleSetPick} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select
            label="Book *"
            value={bookId}
            onChange={e => setBookId(e.target.value)}
            required
          >
            <option value="">Choose a book…</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
            ))}
          </Select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Select label="Month" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </Select>
            <Input label="Year" type="number" value={year} onChange={e => setYear(e.target.value)} min="2020" max="2030" />
          </div>

          <Input
            label="Theme (optional)"
            placeholder="e.g. Stories of resilience"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          />

          <Textarea
            label="Discussion guide (optional)"
            placeholder={"Write discussion prompts, context, or questions for members.\n\nSeparate paragraphs with a blank line."}
            value={guide}
            onChange={e => setGuide(e.target.value)}
            rows={6}
          />

          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Setting a new pick will automatically archive the current active pick and create a pinned discussion thread.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setPickModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!bookId}>Set pick</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function DiscussionsAdmin({ activePick, toggleLock }) {
  const { discussions, loading, refetch } = useDiscussions({ clubPickId: activePick?.id })

  if (!activePick) return (
    <div className={styles.empty}>No active pick. Set one to see its discussions.</div>
  )

  if (loading) return <p className={styles.loading}>Loading discussions…</p>

  return (
    <div>
      <p className={styles.discussionsNote}>
        Showing discussions for <strong>{activePick.title}</strong> ({MONTH_NAMES[activePick.month - 1]} {activePick.year})
      </p>
      {discussions.length === 0 ? (
        <div className={styles.empty}>No discussions yet.</div>
      ) : (
        <div className={styles.discussionsList}>
          {discussions.map(d => (
            <div key={d.id} className={styles.discussionRow}>
              <div className={styles.discussionRowInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {d.pinned && <span className={styles.pin}>📌</span>}
                  {d.locked && <span className={styles.lock}>🔒</span>}
                  <p className={styles.discussionTitle}>{d.title}</p>
                </div>
                <p className={styles.discussionMeta}>
                  {d.post_count || 0} posts
                  {d.last_post_at && ` · Last post ${format(new Date(d.last_post_at), 'd MMM yyyy')}`}
                  {d.created_by_name && ` · Started by ${d.created_by_name}`}
                </p>
              </div>
              <Button
                size="sm"
                variant={d.locked ? 'secondary' : 'danger'}
                onClick={async () => { await toggleLock(d.id, !d.locked); refetch() }}
              >
                {d.locked ? 'Unlock' : 'Lock'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FlaggedPostCard({ post, onHide, onApprove }) {
  return (
    <div className={styles.flaggedCard}>
      <div className={styles.flaggedHeader}>
        <span className={styles.flaggedAuthor}>{post.members?.full_name}</span>
        <span className={styles.flaggedDiscussion}>in: {post.discussions?.title}</span>
        <span className={styles.flaggedDate}>
          {format(new Date(post.created_at), 'd MMM yyyy HH:mm')}
        </span>
      </div>
      <p className={styles.flaggedBody}>{post.body}</p>
      <div className={styles.flaggedActions}>
        <Button size="sm" variant="danger" onClick={onHide}>Hide post</Button>
        <Button size="sm" variant="secondary" onClick={onApprove}>Approve & unflag</Button>
      </div>
    </div>
  )
}
