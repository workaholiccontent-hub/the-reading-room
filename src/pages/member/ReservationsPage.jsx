import { Link } from 'react-router-dom'
import { useReservations } from '@/hooks/useReservations'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import styles from './ReservationsPage.module.css'
import { format } from 'date-fns'

export default function ReservationsPage() {
  const { pending, fulfilled, loading, cancel } = useReservations()

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Reservations"
        subtitle="Books you've queued for when they become available."
        action={
          <Link to="/catalogue">
            <Button variant="secondary">Browse catalogue</Button>
          </Link>
        }
      />

      {loading ? (
        <div className={styles.loading}>Loading reservations…</div>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Pending
              {pending.length > 0 && <span className={styles.count}>{pending.length}</span>}
            </h2>
            {pending.length === 0 ? (
              <div className={styles.empty}>
                <p>No pending reservations.</p>
                <Link to="/catalogue" className={styles.emptyLink}>
                  Browse unavailable books to reserve one →
                </Link>
              </div>
            ) : (
              <div className={`${styles.list} stagger`}>
                {pending.map(r => (
                  <ReservationCard key={r.id} reservation={r} onCancel={() => cancel(r.id)} />
                ))}
              </div>
            )}
          </section>

          {fulfilled.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Fulfilled
                <span className={styles.count}>{fulfilled.length}</span>
              </h2>
              <div className={`${styles.list} stagger`}>
                {fulfilled.map(r => (
                  <ReservationCard key={r.id} reservation={r} past />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ReservationCard({ reservation: r, onCancel, past = false }) {
  return (
    <div className={`${styles.card} ${past ? styles.pastCard : ''}`}>
      <div className={styles.cover}>
        {r.books?.cover_url
          ? <img src={r.books.cover_url} alt="" />
          : <div className={styles.coverPlaceholder}>{r.books?.title?.charAt(0)}</div>
        }
      </div>
      <div className={styles.info}>
        <Link to={`/books/${r.book_id}`}>
          <h3 className={styles.title}>{r.books?.title}</h3>
        </Link>
        <p className={styles.author}>{r.books?.author}</p>
        <p className={styles.date}>
          Reserved {format(new Date(r.reserved_at), 'd MMM yyyy')}
        </p>
        {r.notes && <p className={styles.notes}>{r.notes}</p>}
        <span className={`${styles.statusBadge} ${past ? styles.statusFulfilled : styles.statusPending}`}>
          {past ? 'Fulfilled' : 'Waiting'}
        </span>
      </div>
      {!past && (
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  )
}
