import { useState } from 'react'
import { useReadingLog } from '@/hooks/useReadingLog'
import { useBooks } from '@/hooks/useBooks'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Select } from '@/components/ui/Input'
import styles from './ReadingLogPage.module.css'
import { format } from 'date-fns'

const STATUS_LABELS = {
  want_to_read: 'Want to read',
  reading:      'Reading',
  finished:     'Finished',
  abandoned:    'Abandoned',
}
const STATUS_COLORS = {
  want_to_read: '#7a6f68',
  reading:      '#c9a84c',
  finished:     '#5a7a6a',
  abandoned:    '#b85c38',
}

export default function ReadingLogPage() {
  const { log, loading, addEntry, updateProgress } = useReadingLog()
  const { books } = useBooks({ limit: 200 })

  const [addOpen, setAddOpen]         = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [editEntry, setEditEntry]     = useState(null)
  const [selectedBookId, setSelectedBookId] = useState('')
  const [totalPages, setTotalPages]   = useState('')
  const [filter, setFilter]           = useState('all')

  // Edit form state
  const [editPages, setEditPages]     = useState('')
  const [editStatus, setEditStatus]   = useState('')

  function openEdit(entry) {
    setEditEntry(entry)
    setEditPages(entry.pages_read || '')
    setEditStatus(entry.status)
    setEditOpen(true)
  }

  async function handleAdd() {
    if (!selectedBookId) return
    const ok = await addEntry(selectedBookId, totalPages ? parseInt(totalPages) : null)
    if (ok) { setAddOpen(false); setSelectedBookId(''); setTotalPages('') }
  }

  async function handleUpdate() {
    if (!editEntry) return
    const ok = await updateProgress(editEntry.id, {
      pagesRead: editPages ? parseInt(editPages) : undefined,
      status: editStatus,
    })
    if (ok) setEditOpen(false)
  }

  const filtered = filter === 'all' ? log : log.filter(e => e.status === filter)

  // Books not already in log
  const alreadyLogged = new Set(log.map(e => e.book_id))
  const addableBooks  = books.filter(b => !alreadyLogged.has(b.id))

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Reading Log"
        subtitle="Track every book you read."
        action={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add book
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className={styles.filters}>
        {['all', 'reading', 'want_to_read', 'finished', 'abandoned'].map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${log.length})` : `${STATUS_LABELS[f]} (${log.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your log…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {filter === 'all' ? 'Your reading log is empty' : `No books with status "${STATUS_LABELS[filter]}"`}
          </p>
          {filter === 'all' && (
            <p className={styles.emptySub}>Add books to track your reading progress.</p>
          )}
        </div>
      ) : (
        <div className={`${styles.grid} stagger`}>
          {filtered.map(entry => (
            <LogCard key={entry.id} entry={entry} onEdit={() => openEdit(entry)} />
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to reading log">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select
            label="Choose a book"
            value={selectedBookId}
            onChange={e => setSelectedBookId(e.target.value)}
          >
            <option value="">Select a book…</option>
            {addableBooks.map(b => (
              <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
            ))}
          </Select>
          <Input
            label="Total pages (optional)"
            type="number"
            placeholder="e.g. 320"
            value={totalPages}
            onChange={e => setTotalPages(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={!selectedBookId}>Add to log</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Update progress">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {editEntry?.books?.title}
          </p>
          <Input
            label="Pages read"
            type="number"
            placeholder={`of ${editEntry?.total_pages || '?'}`}
            value={editPages}
            onChange={e => setEditPages(e.target.value)}
          />
          <Select
            label="Status"
            value={editStatus}
            onChange={e => setEditStatus(e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdate}>Save progress</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function LogCard({ entry, onEdit }) {
  const pct = entry.total_pages && entry.pages_read
    ? Math.min(100, Math.round((entry.pages_read / entry.total_pages) * 100))
    : null

  const [quickPages, setQuickPages] = useState('')
  const [saving, setSaving]         = useState(false)
  const { updateProgress }          = useReadingLog()

  async function handleQuickUpdate(e) {
    e.preventDefault()
    if (!quickPages) return
    setSaving(true)
    await updateProgress(entry.id, { pagesRead: parseInt(quickPages) })
    setQuickPages('')
    setSaving(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.coverThumb}>
          {entry.books?.cover_url
            ? <img src={entry.books.cover_url} alt="" />
            : <div className={styles.coverInit}>{entry.books?.title?.charAt(0)}</div>
          }
        </div>
        <div className={styles.cardInfo}>
          <h3 className={styles.cardTitle}>{entry.books?.title}</h3>
          <p className={styles.cardAuthor}>{entry.books?.author}</p>
          <span
            className={styles.statusBadge}
            style={{ color: STATUS_COLORS[entry.status] }}
          >
            {STATUS_LABELS[entry.status]}
          </span>
        </div>
      </div>

      {pct !== null && (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressInfo}>
            {entry.pages_read} / {entry.total_pages} pages · {pct}%
          </span>
        </div>
      )}

      {entry.started_at && (
        <p className={styles.dates}>
          Started {format(new Date(entry.started_at), 'd MMM yyyy')}
          {entry.finished_at && ` · Finished ${format(new Date(entry.finished_at), 'd MMM yyyy')}`}
        </p>
      )}

      {/* Quick page update — only for books currently being read */}
      {entry.status === 'reading' && entry.total_pages && (
        <form onSubmit={handleQuickUpdate} className={styles.quickUpdate}>
          <input
            type="number"
            min="1"
            max={entry.total_pages}
            placeholder={`Page (of ${entry.total_pages})`}
            value={quickPages}
            onChange={e => setQuickPages(e.target.value)}
            className={styles.quickInput}
          />
          <button
            type="submit"
            className={styles.quickBtn}
            disabled={!quickPages || saving}
          >
            {saving ? '…' : 'Update'}
          </button>
        </form>
      )}

      <button className={styles.editBtn} onClick={onEdit}>
        Full update / change status →
      </button>
    </div>
  )
}
