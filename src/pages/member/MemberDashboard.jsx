import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useMyLoans } from '@/hooks/useLoans'
import { useReadingLog } from '@/hooks/useReadingLog'
import { useReservations } from '@/hooks/useReservations'
import { useMyActivity } from '@/hooks/useActivity'
import StatCard from '@/components/ui/StatCard'
import PageHeader from '@/components/ui/PageHeader'
import ActivityFeed from '@/components/ui/ActivityFeed'
import styles from './MemberDashboard.module.css'
import { differenceInDays, format } from 'date-fns'

export default function MemberDashboard() {
  const { member } = useAuth()
  const { activeLoans, pastLoans, loading: loansLoading } = useMyLoans()
  const { currentlyReading, finished } = useReadingLog()
  const { pending: pendingRes } = useReservations()
  const { feed, loading: activityLoading } = useMyActivity(10)

  const overdue = activeLoans.filter(l => new Date(l.due_date) < new Date())
  const dueSoon = activeLoans.filter(l => {
    const days = differenceInDays(new Date(l.due_date), new Date())
    return days >= 0 && days <= 3
  })

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={`Hello, ${member?.full_name?.split(' ')[0]} 👋`}
        subtitle={`Member ${member?.membership_number} · ${member?.status === 'active' ? 'Active member' : 'Pending approval'}`}
      />

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className={styles.alert}>
          <strong>Overdue:</strong> You have {overdue.length} overdue book{overdue.length > 1 ? 's' : ''}.
          Please return {overdue.length > 1 ? 'them' : 'it'} as soon as possible.
          <Link to="/member/books" className={styles.alertLink}>View books →</Link>
        </div>
      )}
      {dueSoon.length > 0 && overdue.length === 0 && (
        <div className={styles.alertWarn}>
          <strong>Due soon:</strong> {dueSoon.length} book{dueSoon.length > 1 ? 's are' : ' is'} due within 3 days.
          <Link to="/member/books" className={styles.alertLink}>View books →</Link>
        </div>
      )}

      {/* Stats */}
      <div className={`${styles.statsGrid} stagger`}>
        <StatCard
          label="Books borrowed now"
          value={activeLoans.length}
          sub={`of 3 allowed`}
          accent
        />
        <StatCard
          label="Currently reading"
          value={currentlyReading.length}
          sub="in your log"
        />
        <StatCard
          label="Books finished"
          value={finished.length}
          sub="all time"
        />
        <StatCard
          label="Pending reservations"
          value={pendingRes.length}
          sub="in queue"
        />
      </div>

      {/* Active loans */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Current loans</h2>
          <Link to="/member/books" className={styles.sectionLink}>Manage →</Link>
        </div>

        {loansLoading ? (
          <p className={styles.loading}>Loading…</p>
        ) : activeLoans.length === 0 ? (
          <div className={styles.empty}>
            <p>No active loans.</p>
            <Link to="/catalogue" className={styles.emptyLink}>Browse the catalogue to borrow a book →</Link>
          </div>
        ) : (
          <div className={`${styles.loanList} stagger`}>
            {activeLoans.map(loan => <LoanRow key={loan.id} loan={loan} />)}
          </div>
        )}
      </section>

      {/* Currently reading */}
      {currentlyReading.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Reading now</h2>
            <Link to="/member/reading" className={styles.sectionLink}>Full log →</Link>
          </div>
          <div className={`${styles.readingList} stagger`}>
            {currentlyReading.slice(0, 3).map(entry => (
              <ReadingRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Activity feed */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <Link to="/member/stats" className={styles.sectionLink}>Full stats →</Link>
        </div>
        <ActivityFeed feed={feed} loading={activityLoading} limit={8} />
      </section>
    </div>
  )
}

function LoanRow({ loan }) {
  const daysLeft = differenceInDays(new Date(loan.due_date), new Date())
  const overdue  = daysLeft < 0
  const dueSoon  = daysLeft >= 0 && daysLeft <= 3

  return (
    <div className={styles.loanRow}>
      <div className={styles.loanCover}>
        {loan.books?.cover_url
          ? <img src={loan.books.cover_url} alt="" />
          : <div className={styles.loanCoverPlaceholder} />
        }
      </div>
      <div className={styles.loanInfo}>
        <p className={styles.loanTitle}>{loan.books?.title}</p>
        <p className={styles.loanAuthor}>{loan.books?.author}</p>
        <p className={styles.loanBorrowed}>
          Borrowed {format(new Date(loan.borrowed_at), 'd MMM yyyy')}
        </p>
      </div>
      <div className={`${styles.dueBadge} ${overdue ? styles.dueOverdue : dueSoon ? styles.dueSoon : styles.dueOk}`}>
        {overdue
          ? `${Math.abs(daysLeft)}d overdue`
          : daysLeft === 0
          ? 'Due today'
          : `${daysLeft}d left`
        }
      </div>
    </div>
  )
}

function ReadingRow({ entry }) {
  const pct = entry.total_pages
    ? Math.round((entry.pages_read / entry.total_pages) * 100)
    : null

  return (
    <div className={styles.readingRow}>
      <div className={styles.readingInfo}>
        <p className={styles.readingTitle}>{entry.books?.title}</p>
        <p className={styles.readingAuthor}>{entry.books?.author}</p>
      </div>
      {pct !== null && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressPct}>{pct}%</span>
        </div>
      )}
    </div>
  )
}
