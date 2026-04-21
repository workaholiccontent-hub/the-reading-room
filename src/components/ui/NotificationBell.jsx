import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Link } from 'react-router-dom'
import styles from './NotificationBell.module.css'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS = {
  due_reminder:      '📅',
  overdue:           '⚠️',
  reservation_ready: '📚',
  welcome:           '👋',
  newsletter:        '📰',
  custom:            '✉️',
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen(o => !o)
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.bell}
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2a6 6 0 00-6 6v3l-1.5 2.5A.5.5 0 003 14.5h14a.5.5 0 00.5-.856L16 11V8a6 6 0 00-6-6z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          />
          <path d="M8 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHead}>
            <span className={styles.dropTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={() => { markAllRead(); }}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.read_at ? styles.unread : ''}`}
                  onClick={() => !n.read_at && markRead(n.id)}
                >
                  <span className={styles.itemIcon}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div className={styles.itemBody}>
                    <p className={styles.itemSubject}>{n.subject}</p>
                    <p className={styles.itemTime}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read_at && <span className={styles.dot} />}
                </div>
              ))
            )}
          </div>

          <div className={styles.dropFoot}>
            <Link to="/member" className={styles.dropFootLink} onClick={() => setOpen(false)}>
              Go to dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
