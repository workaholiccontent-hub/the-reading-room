import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Public pages
import PublicLayout     from '@/components/layout/PublicLayout'
import HomePage         from '@/pages/public/HomePage'
import CataloguePage    from '@/pages/public/CataloguePage'
import BookDetailPage   from '@/pages/public/BookDetailPage'
import SignUpPage       from '@/pages/public/SignUpPage'
import LoginPage        from '@/pages/public/LoginPage'
import AboutPage        from '@/pages/public/AboutPage'

// Member pages
import MemberLayout     from '@/components/layout/MemberLayout'
import MemberDashboard  from '@/pages/member/MemberDashboard'
import MyBooksPage      from '@/pages/member/MyBooksPage'
import ReadingLogPage   from '@/pages/member/ReadingLogPage'
import ReservationsPage from '@/pages/member/ReservationsPage'
import MemberProfilePage from '@/pages/member/MemberProfilePage'

// Admin pages
import AdminLayout              from '@/components/layout/AdminLayout'
import AdminDashboard           from '@/pages/admin/AdminDashboard'
import AdminBooksPage           from '@/pages/admin/AdminBooksPage'
import AdminMembersPage         from '@/pages/admin/AdminMembersPage'
import AdminLoansPage           from '@/pages/admin/AdminLoansPage'
import AdminEmailPage           from '@/pages/admin/AdminEmailPage'
import AdminCorrespondencePage  from '@/pages/admin/AdminCorrespondencePage'
import AdminClubPage            from '@/pages/admin/AdminClubPage'

// Club pages
import BookClubPage  from '@/pages/public/BookClubPage'
import ClubPage      from '@/pages/member/ClubPage'

// Phase 5 pages
import LeaderboardPage   from '@/pages/public/LeaderboardPage'
import MemberStatsPage   from '@/pages/member/MemberStatsPage'
import AdminWaitlistPage from '@/pages/admin/AdminWaitlistPage'

// Phase 6 pages
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage'

// Guards
function MemberRoute({ children }) {
  const { user, member, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!member) return <PageLoader />
  return children
}

function AdminRoute({ children }) {
  const { user, member, loading, isAdmin } = useAuth()
  if (loading) return <PageLoader />
  if (!user || !isAdmin) return <Navigate to="/" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40,
          border: '2px solid var(--paper-dark)',
          borderTopColor: 'var(--gold)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          Opening the library…
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/"              element={<HomePage />} />
        <Route path="/catalogue"     element={<CataloguePage />} />
        <Route path="/books/:id"     element={<BookDetailPage />} />
        <Route path="/about"         element={<AboutPage />} />
        <Route path="/club"          element={<BookClubPage />} />
        <Route path="/leaderboard"   element={<LeaderboardPage />} />
        <Route path="/signup"        element={<SignUpPage />} />
        <Route path="/login"         element={<LoginPage />} />
      </Route>

      {/* Member */}
      <Route path="/member" element={<MemberRoute><MemberLayout /></MemberRoute>}>
        <Route index               element={<MemberDashboard />} />
        <Route path="books"        element={<MyBooksPage />} />
        <Route path="reading"      element={<ReadingLogPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="club"         element={<ClubPage />} />
        <Route path="stats"        element={<MemberStatsPage />} />
        <Route path="profile"      element={<MemberProfilePage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index                 element={<AdminDashboard />} />
        <Route path="analytics"      element={<AdminAnalyticsPage />} />
        <Route path="books"          element={<AdminBooksPage />} />
        <Route path="members"        element={<AdminMembersPage />} />
        <Route path="loans"          element={<AdminLoansPage />} />
        <Route path="email"          element={<AdminEmailPage />} />
        <Route path="correspondence" element={<AdminCorrespondencePage />} />
        <Route path="club"           element={<AdminClubPage />} />
        <Route path="waitlist"       element={<AdminWaitlistPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
