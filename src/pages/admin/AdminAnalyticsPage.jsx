import { useAnalytics } from '@/hooks/useAnalytics'
import { useRecentActivity } from '@/hooks/useActivity'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import ActivityFeed from '@/components/ui/ActivityFeed'
import styles from './AdminAnalyticsPage.module.css'
import { format } from 'date-fns'

export default function AdminAnalyticsPage() {
  const {
    loansPerMonth, signupsPerMonth,
    topBooks, genreStats, summary, loading
  } = useAnalytics()
  const { feed: recentActivity, loading: activityLoading } = useRecentActivity(20)

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="Analytics" />
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    )
  }

  const maxLoans   = Math.max(...loansPerMonth.map(m => m.loan_count), 1)
  const maxSignups = Math.max(...signupsPerMonth.map(m => m.new_members), 1)
  const maxBorrows = Math.max(...(genreStats.map(g => g.borrow_count)), 1)

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Analytics" subtitle="Library activity at a glance." />

      {/* Summary stats */}
      <div className={`${styles.summaryGrid} stagger`}>
        <StatCard label="Total books"     value={summary?.totalBooks    ?? '—'} accent />
        <StatCard label="Active members"  value={summary?.activeMembers ?? '—'} />
        <StatCard label="Active loans"    value={summary?.activeLoans   ?? '—'} />
        <StatCard label="Total loans ever" value={summary?.totalLoans   ?? '—'} />
        <StatCard label="Reviews"         value={summary?.totalReviews  ?? '—'} />
        <StatCard label="Discussion posts" value={summary?.totalPosts   ?? '—'} />
      </div>

      <div className={styles.chartsRow}>
        {/* Loans per month bar chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Loans per month</h2>
          <p className={styles.chartSub}>Last 12 months</p>
          <div className={styles.barChart}>
            {loansPerMonth.length === 0 ? (
              <p className={styles.noData}>No loan data yet.</p>
            ) : (
              loansPerMonth.map((m, i) => (
                <div key={i} className={styles.barCol}>
                  <div className={styles.barWrap}>
                    <div
                      className={styles.bar}
                      style={{ height: `${(m.loan_count / maxLoans) * 100}%` }}
                      title={`${m.loan_count} loans`}
                    />
                  </div>
                  <span className={styles.barLabel}>
                    {format(new Date(m.month), 'MMM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Member signups per month */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>New members per month</h2>
          <p className={styles.chartSub}>Last 12 months</p>
          <div className={styles.barChart}>
            {signupsPerMonth.length === 0 ? (
              <p className={styles.noData}>No signup data yet.</p>
            ) : (
              signupsPerMonth.map((m, i) => (
                <div key={i} className={styles.barCol}>
                  <div className={styles.barWrap}>
                    <div
                      className={`${styles.bar} ${styles.barGold}`}
                      style={{ height: `${(m.new_members / maxSignups) * 100}%` }}
                      title={`${m.new_members} members`}
                    />
                  </div>
                  <span className={styles.barLabel}>
                    {format(new Date(m.month), 'MMM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottomRow}>
        {/* Top borrowed books */}
        <div className={styles.tableCard}>
          <h2 className={styles.chartTitle}>Most borrowed books</h2>
          {topBooks.length === 0 ? (
            <p className={styles.noData}>No borrowing data yet.</p>
          ) : (
            <div className={styles.topBooksList}>
              {topBooks.map((b, i) => (
                <div key={b.id} className={styles.topBookRow}>
                  <span className={styles.topBookRank}>#{i + 1}</span>
                  <div className={styles.topBookCover}>
                    {b.cover_url
                      ? <img src={b.cover_url} alt="" />
                      : <div className={styles.topBookCoverInit}>{b.title.charAt(0)}</div>
                    }
                  </div>
                  <div className={styles.topBookInfo}>
                    <p className={styles.topBookTitle}>{b.title}</p>
                    <p className={styles.topBookAuthor}>{b.author}</p>
                  </div>
                  <div className={styles.topBookStats}>
                    <span className={styles.topBookCount}>{b.borrow_count}</span>
                    <span className={styles.topBookCountLabel}>borrows</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Genre breakdown */}
        <div className={styles.tableCard}>
          <h2 className={styles.chartTitle}>Genre popularity</h2>
          {genreStats.length === 0 ? (
            <p className={styles.noData}>No genre data yet.</p>
          ) : (
            <div className={styles.genreList}>
              {genreStats.slice(0, 8).map(g => (
                <div key={g.genre} className={styles.genreRow}>
                  <div className={styles.genreInfo}>
                    <span className={styles.genreName}>{g.genre}</span>
                    <span className={styles.genreBooks}>{g.book_count} books</span>
                  </div>
                  <div className={styles.genreBarWrap}>
                    <div
                      className={styles.genreBar}
                      style={{ width: `${(g.borrow_count / maxBorrows) * 100}%` }}
                    />
                  </div>
                  <span className={styles.genreCount}>{g.borrow_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className={styles.activityCard}>
        <h2 className={styles.chartTitle}>Recent activity</h2>
        <p className={styles.chartSub}>Latest actions across all members</p>
        <div style={{ marginTop: 16 }}>
          <ActivityFeed feed={recentActivity} loading={activityLoading} showMember limit={20} />
        </div>
      </div>
    </div>
  )
}
