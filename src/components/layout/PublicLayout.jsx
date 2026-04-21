import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import GlobalSearch from '@/components/ui/GlobalSearch'
import NotificationBell from '@/components/ui/NotificationBell'
import styles from './PublicLayout.module.css'

export default function PublicLayout() {
  const { user, member, signOut } = useAuth()
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Cmd/Ctrl+K opens search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className={styles.shell}>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.wordmark}>
            <span className={styles.wordmarkThe}>The</span>
            <span className={styles.wordmarkMain}>Reading Room</span>
          </Link>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
            <NavLink to="/catalogue" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Catalogue
            </NavLink>
            <NavLink to="/club" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Book Club
            </NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              Leaderboard
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              About
            </NavLink>
            {user && member ? (
              <>
                <NavLink to="/member" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                  My Library
                </NavLink>
                {member.role === 'admin' && (
                  <NavLink to="/admin" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                    Admin
                  </NavLink>
                )}
                <button onClick={handleSignOut} className={styles.signOutBtn}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                  Sign in
                </NavLink>
                <Link to="/signup" className={styles.joinBtn}>
                  Join the club
                </Link>
              </>
            )}
          </nav>

          <div className={styles.headerActions}>
            {/* Search trigger */}
            <button
              className={styles.searchTrigger}
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              title="Search (⌘K)"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className={styles.searchTriggerLabel}>Search</span>
              <kbd className={styles.searchKbd}>⌘K</kbd>
            </button>

            {/* Notification bell — only when signed in */}
            {user && member && <NotificationBell />}

            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerWordmark}>The Reading Room</span>
            <p>A community library and book club for curious minds.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/catalogue">Catalogue</Link>
            <Link to="/club">Book Club</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/about">About</Link>
            <Link to="/signup">Join</Link>
            <Link to="/login">Sign in</Link>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} The Reading Room</p>
        </div>
      </footer>
    </div>
  )
}
