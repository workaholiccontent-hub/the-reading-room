import { Link } from 'react-router-dom'
import styles from './ActivityFeed.module.css'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG = {
  borrowed:         { icon: '📖', color: 'var(--sage)',      label: 'Borrowed' },
  returned:         { icon: '↩',  color: 'var(--ink-muted)', label: 'Returned' },
  started_reading:  { icon: '▶',  color: 'var(--gold-dark)', label: 'Started reading' },
  finished_reading: { icon: '✓',  color: 'var(--sage)',      label: 'Finished' },
  reviewed:         { icon: '★',  color: 'var(--gold)',      label: 'Reviewed' },
  posted:           { icon: '💬', color: 'var(--ink-muted)', label: 'Posted in' },
}

export default function ActivityFeed({ feed, loading, showMember = false, limit = 10 }) {
  const items = feed.slice(0, limit)

  if (loading) {
    return (
      <div className={styles.loadingList}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No activity yet. Borrow a book to get started!</p>
      </div>
    )
  }

  return (
    <div className={styles.feed}>
      {items.map((item, i) => {
        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.borrowed
        const isBook = item.subject_type === 'book'
        return (
          <div key={`${item.type}-${i}`} className={styles.item}>
            <div className={styles.iconWrap} style={{ '--color': cfg.color }}>
              <span className={styles.icon}>{cfg.icon}</span>
            </div>
            <div className={styles.body}>
              <p className={styles.text}>
                {showMember && item.members && (
                  <span className={styles.memberName}>{item.members.full_name} </span>
                )}
                <span className={styles.action}>{cfg.label}</span>
                {' '}
                {isBook ? (
                  <Link to={`/books/${item.subject_id}`} className={styles.subjectLink}>
                    {item.subject}
                  </Link>
                ) : (
                  <span className={styles.subject}>{item.subject}</span>
                )}
              </p>
              <span className={styles.time}>
                {item.created_at
                  ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
                  : ''}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
