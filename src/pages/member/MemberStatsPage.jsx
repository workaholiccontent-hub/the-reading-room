import { useMyStats, computeAchievements, ACHIEVEMENTS } from '@/hooks/useStats'
import { useAuth } from '@/context/AuthContext'
import PageHeader from '@/components/ui/PageHeader'
import { Link } from 'react-router-dom'
import styles from './MemberStatsPage.module.css'
import { format, differenceInDays } from 'date-fns'

export default function MemberStatsPage() {
  const { member }            = useAuth()
  const { stats, rank, loading } = useMyStats()
  const achievements          = computeAchievements(stats, member)

  const earned  = achievements.filter(a => a.earned)
  const locked  = achievements.filter(a => !a.earned)

  const memberDays = member?.joined_at
    ? differenceInDays(new Date(), new Date(member.joined_at))
    : 0

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="My Stats" />
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="My Stats"
        subtitle="Your reading life at a glance."
        action={
          <Link to="/member/leaderboard" className={styles.lbLink}>
            View leaderboard →
          </Link>
        }
      />

      {/* Hero stat bar */}
      <div className={styles.heroBar}>
        <HeroStat value={stats?.books_finished ?? 0}    label="Books finished" />
        <HeroStat value={stats?.total_pages_read ?? 0}  label="Pages read"     />
        <HeroStat value={stats?.reviews_written ?? 0}   label="Reviews written" />
        <HeroStat value={stats?.discussion_posts ?? 0}  label="Discussion posts" />
        <HeroStat value={rank ? `#${rank}` : '—'}       label="Reading rank"   highlight />
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <StatBlock
          title="Reading"
          items={[
            ['Currently reading',  stats?.currently_reading ?? 0],
            ['Books finished',     stats?.books_finished    ?? 0],
            ['Books in log',       stats?.total_log_entries ?? 0],
            ['Pages read',         (stats?.total_pages_read ?? 0).toLocaleString()],
          ]}
        />
        <StatBlock
          title="Borrowing"
          items={[
            ['Total loans',        stats?.total_loans         ?? 0],
            ['Active loans',       stats?.active_loans        ?? 0],
            ['Reservations made',  stats?.total_reservations  ?? 0],
          ]}
        />
        <StatBlock
          title="Community"
          items={[
            ['Reviews written',    stats?.reviews_written     ?? 0],
            ['Discussion posts',   stats?.discussion_posts    ?? 0],
            ['Discussions joined', stats?.discussions_joined  ?? 0],
          ]}
        />
        <StatBlock
          title="Membership"
          items={[
            ['Member number',    member?.membership_number ?? '—'],
            ['Days as member',   memberDays.toLocaleString()],
            ['Joined',           member?.joined_at ? format(new Date(member.joined_at), 'd MMMM yyyy') : '—'],
          ]}
        />
      </div>

      {/* Reading pace */}
      {stats?.books_finished > 0 && memberDays > 0 && (
        <div className={styles.paceCard}>
          <div className={styles.paceLeft}>
            <span className={styles.paceLabel}>Your reading pace</span>
            <span className={styles.paceValue}>
              {(stats.books_finished / (memberDays / 30)).toFixed(1)}
            </span>
            <span className={styles.paceUnit}>books per month</span>
          </div>
          <div className={styles.paceDivider} />
          <div className={styles.paceRight}>
            <span className={styles.paceLabel}>At this pace, in a year you'll read</span>
            <span className={styles.paceValue}>
              {Math.round((stats.books_finished / (memberDays / 365)))}
            </span>
            <span className={styles.paceUnit}>books</span>
          </div>
        </div>
      )}

      {/* Achievements */}
      <section className={styles.achievementsSection}>
        <div className={styles.achievementsHead}>
          <h2 className={styles.achievementsTitle}>
            Achievements
            <span className={styles.achievementCount}>
              {earned.length}/{ACHIEVEMENTS.length}
            </span>
          </h2>
        </div>

        {earned.length > 0 && (
          <div className={`${styles.achievementsGrid} stagger`}>
            {earned.map(a => (
              <AchievementCard key={a.id} achievement={a} earned />
            ))}
          </div>
        )}

        {locked.length > 0 && (
          <>
            <p className={styles.lockedLabel}>Still to unlock</p>
            <div className={styles.achievementsGrid}>
              {locked.map(a => (
                <AchievementCard key={a.id} achievement={a} earned={false} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function HeroStat({ value, label, highlight = false }) {
  return (
    <div className={`${styles.heroStat} ${highlight ? styles.heroStatHighlight : ''}`}>
      <span className={styles.heroStatValue}>{value}</span>
      <span className={styles.heroStatLabel}>{label}</span>
    </div>
  )
}

function StatBlock({ title, items }) {
  return (
    <div className={styles.statBlock}>
      <h3 className={styles.statBlockTitle}>{title}</h3>
      <div className={styles.statBlockRows}>
        {items.map(([label, value]) => (
          <div key={label} className={styles.statRow}>
            <span className={styles.statRowLabel}>{label}</span>
            <span className={styles.statRowValue}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AchievementCard({ achievement, earned }) {
  return (
    <div className={`${styles.achievement} ${earned ? styles.achievementEarned : styles.achievementLocked}`}>
      <span className={styles.achievementIcon}>{achievement.icon}</span>
      <div className={styles.achievementInfo}>
        <p className={styles.achievementTitle}>{achievement.title}</p>
        <p className={styles.achievementDesc}>{achievement.desc}</p>
      </div>
      {earned && <span className={styles.achievementCheck}>✓</span>}
    </div>
  )
}
