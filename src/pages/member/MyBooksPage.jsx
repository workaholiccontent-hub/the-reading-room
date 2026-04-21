import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyLoans } from '@/hooks/useLoans'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import styles from './MyBooksPage.module.css'
import { differenceInDays, format } from 'date-fns'

export default function MyBooksPage() {
  const { activeLoans, pastLoans, loading, returnBook } = useMyLoans()
  const [returning, setReturning] = useState(null)
  const [tab, setTab] = useState('active')

  async function confirmReturn() {
    if (!returning) return
    await returnBook(returning)
    setReturning(null)
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="My Books"
        subtitle="Your borrowed books and lending history."
        action={
          <Link to="/catalogue">
            <Button variant="secondary">Browse catalogue</Button>
          </Link>
        }
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'active' ? styles.active : ''}`}
          onClick={() => setTab('active')}
        >
          Current loans
          {activeLoans.length > 0 && (
            <span className={styles.tabBadge}>{activeLoans.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'history' ? styles.active : ''}`}
          onClick={() => setTab('history')}
        >
          History
          {pastLoans.length > 0 && (
            <span className={styles.tabBadge}>{pastLoans.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your books…</div>
      ) : tab === 'active' ? (
        activeLoans.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No active loans</p>
            <p className={styles.emptySub}>Head to the catalogue to borrow something great.</p>
            <Link to="/catalogue">
              <Button variant="primary" style={{ marginTop: 16 }}>Browse catalogue</Button>
            </Link>
          </div>
        ) : (
          <div className={`${styles.list} stagger`}>
            {activeLoans.map(loan => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onReturn={() => setReturning(loan.id)}
              />
            ))}
          </div>
        )
      ) : (
        pastLoans.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No history yet</p>
            <p className={styles.emptySub}>Books you return will appear here.</p>
          </div>
        ) : (
          <div className={`${styles.list} stagger`}>
            {pastLoans.map(loan => (
              <LoanCard key={loan.id} loan={loan} past />
            ))}
          </div>
        )
      )}

      {/* Confirm return modal */}
      <Modal
        open={!!returning}
        onClose={() => setReturning(null)}
        title="Return this book?"
      >
        <p style={{ fontSize: 15, color: 'var(--ink-muted)', marginBottom: 24 }}>
          Make sure you have the physical book ready to hand back. This will mark it as returned.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setReturning(null)}>Cancel</Button>
          <Button variant="primary" onClick={confirmReturn}>Yes, return it</Button>
        </div>
      </Modal>
    </div>
  )
}

function LoanCard({ loan, onReturn, past = false }) {
  const daysLeft = differenceInDays(new Date(loan.due_date), new Date())
  const overdue  = !past && daysLeft < 0
  const dueSoon  = !past && daysLeft >= 0 && daysLeft <= 3

  return (
    <div className={`${styles.card} ${overdue ? styles.overdueCard : ''}`}>
      <div className={styles.cardCover}>
        {loan.books?.cover_url
          ? <img src={loan.books.cover_url} alt={loan.books.title} />
          : <div className={styles.coverPlaceholder}>{loan.books?.title?.charAt(0)}</div>
        }
      </div>
      <div className={styles.cardBody}>
        <Link to={`/books/${loan.book_id}`}>
          <h3 className={styles.cardTitle}>{loan.books?.title}</h3>
        </Link>
        <p className={styles.cardAuthor}>{loan.books?.author}</p>
        {loan.books?.genre && <span className={styles.genre}>{loan.books.genre}</span>}

        <div className={styles.cardMeta}>
          <span>Borrowed {format(new Date(loan.borrowed_at), 'd MMM yyyy')}</span>
          {past
            ? <span>Returned {loan.returned_at ? format(new Date(loan.returned_at), 'd MMM yyyy') : '—'}</span>
            : <span className={overdue ? styles.metaOverdue : dueSoon ? styles.metaSoon : ''}>
                Due {format(new Date(loan.due_date), 'd MMM yyyy')}
                {overdue && ` (${Math.abs(daysLeft)}d overdue)`}
                {!overdue && daysLeft === 0 && ' (today)'}
                {!overdue && daysLeft > 0 && daysLeft <= 3 && ` (${daysLeft}d left)`}
              </span>
          }
        </div>
      </div>
      {!past && (
        <div className={styles.cardAction}>
          <Button variant={overdue ? 'danger' : 'secondary'} size="sm" onClick={onReturn}>
            Return
          </Button>
        </div>
      )}
    </div>
  )
}
