import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/admin',                label: 'Overview',        icon: '◈', end: true },
  { to: '/admin/analytics',      label: 'Analytics',       icon: '◉' },
  { to: '/admin/books',          label: 'Books',           icon: '▣' },
  { to: '/admin/members',        label: 'Members',         icon: '◎' },
  { to: '/admin/loans',          label: 'Loans',           icon: '⟳' },
  { to: '/admin/waitlist',       label: 'Waitlist',        icon: '⏳' },
  { to: '/admin/email',          label: 'Email',           icon: '✉' },
  { to: '/admin/correspondence',  label: 'Correspondence',  icon: '✎' },
  { to: '/admin/club',           label: 'Book Club',       icon: '◉' },
]

export default function AdminLayout() {
  const { member, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandLabel}>Admin Panel</span>
          <Link to="/" className={styles.brandSub}>The Reading Room ↗</Link>
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
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.adminBadge}>
          <span>{member?.full_name}</span>
          <span className={styles.role}>Administrator</span>
        </div>

        <button onClick={handleSignOut} className={styles.signOutBtn}>
          Sign out
        </button>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
