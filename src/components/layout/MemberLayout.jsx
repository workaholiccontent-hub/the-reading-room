import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './MemberLayout.module.css'

const NAV = [
  { to: '/member',              label: 'Dashboard',    icon: '⊞', end: true },
  { to: '/member/books',        label: 'My Books',     icon: '📖' },
  { to: '/member/reading',      label: 'Reading Log',  icon: '✏' },
  { to: '/member/reservations', label: 'Reservations', icon: '⏳' },
  { to: '/member/club',         label: 'Book Club',    icon: '◉' },
  { to: '/member/stats',        label: 'My Stats',     icon: '◈' },
  { to: '/member/profile',      label: 'Profile',      icon: '◎' },
]

export default function MemberLayout() {
  const { member, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandSmall}>The</span>
          <span className={styles.brandMain}>Reading Room</span>
        </Link>

        <div className={styles.memberChip}>
          <div className={styles.avatar}>
            {member?.full_name?.charAt(0).toUpperCase() ?? 'M'}
          </div>
          <div>
            <div className={styles.memberName}>{member?.full_name}</div>
            <div className={styles.memberNumber}>{member?.membership_number}</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link to="/catalogue" className={styles.bottomLink}>
            ← Back to catalogue
          </Link>
          <button onClick={handleSignOut} className={styles.signOutBtn}>
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
