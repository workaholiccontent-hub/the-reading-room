import { Link } from 'react-router-dom'
import { useActivePick, useClubPicks, useDiscussions } from '@/hooks/useClub'
import { useAuth } from '@/context/AuthContext'
import styles from './BookClubPage.module.css'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

export default function BookClubPage() {
  const { pick, loading }         = useActivePick()
  const { picks: archive }        = useClubPicks()
  const { user }                  = useAuth()

  const pastPicks = archive.filter(p => !p.active)

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Community book club</span>
          <h1 className={styles.heroTitle}>Read together.<br/><em>Think together.</em></h1>
          <p className={styles.heroSub}>
            Each month we pick one book, read it together, and share what we find.
            Members get discussion prompts, author notes, and a place to talk it all through.
          </p>
          {!user && (
            <div className={styles.heroCta}>
              <Link to="/signup" className={styles.ctaPrimary}>Join to participate</Link>
              <Link to="/catalogue" className={styles.ctaSecondary}>Browse catalogue →</Link>
            </div>
          )}
        </div>
      </div>

      <div className={styles.inner}>

        {/* ── This month's pick ── */}
        <section className={styles.pickSection}>
          <span className={styles.sectionEyebrow}>This month's pick</span>

          {loading ? (
            <div className={styles.pickSkeleton} />
          ) : !pick ? (
            <div className={styles.noPick}>
              <p>No book selected for this month yet. Check back soon.</p>
            </div>
          ) : (
            <div className={styles.pickCard}>
              <div className={styles.pickCover}>
                {pick.cover_url
                  ? <img src={pick.cover_url} alt={pick.title} />
                  : <PickPlaceholder title={pick.title} />
                }
                <div className={styles.pickMonthBadge}>
                  {MONTH_NAMES[pick.month - 1]} {pick.year}
                </div>
              </div>

              <div className={styles.pickInfo}>
                {pick.genre && <span className={styles.pickGenre}>{pick.genre}</span>}
                <h2 className={styles.pickTitle}>{pick.title}</h2>
                <p className={styles.pickAuthor}>by {pick.author}</p>

                {pick.avg_rating && (
                  <div className={styles.pickRating}>
                    <Stars rating={pick.avg_rating} />
                    <span>{Number(pick.avg_rating).toFixed(1)}</span>
                    <span className={styles.ratingCount}>({pick.review_count} reviews)</span>
                  </div>
                )}

                {pick.theme && (
                  <div className={styles.pickTheme}>
                    <span className={styles.pickThemeLabel}>This month's theme</span>
                    <p>{pick.theme}</p>
                  </div>
                )}

                {pick.description && (
                  <p className={styles.pickDesc}>
                    {pick.description.substring(0, 280)}
                    {pick.description.length > 280 ? '…' : ''}
                  </p>
                )}

                <div className={styles.pickActions}>
                  {pick.available_copies > 0 ? (
                    <span className={styles.availBadge}>
                      {pick.available_copies} cop{pick.available_copies === 1 ? 'y' : 'ies'} available
                    </span>
                  ) : (
                    <span className={styles.unavailBadge}>All copies borrowed</span>
                  )}

                  <Link to={`/books/${pick.book_id}`} className={styles.pickBookLink}>
                    View book & borrow →
                  </Link>

                  {user && (
                    <Link to="/member/club" className={styles.pickDiscussLink}>
                      Join the discussion →
                    </Link>
                  )}
                </div>

                {pick.discussion_guide && (
                  <div className={styles.guideBox}>
                    <p className={styles.guideLabel}>Discussion guide</p>
                    <div className={styles.guideContent}>
                      {pick.discussion_guide.split('\n\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Stats strip ── */}
        {pick && (
          <div className={styles.statsStrip}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{pick.discussion_count || 0}</span>
              <span className={styles.statLabel}>Discussions</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{pick.review_count || 0}</span>
              <span className={styles.statLabel}>Reviews</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{pastPicks.length + 1}</span>
              <span className={styles.statLabel}>Books read together</span>
            </div>
          </div>
        )}

        {/* ── How it works ── */}
        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>How the book club works</h2>
          <div className={styles.howGrid}>
            {[
              { n: '01', title: 'New pick each month', body: 'We choose one book and announce it at the start of the month. Members borrow it or read their own copy.' },
              { n: '02', title: 'Read at your own pace', body: 'No strict schedule. Read as fast or slowly as you like. Discussions stay open the whole month.' },
              { n: '03', title: 'Join the discussion', body: 'Share thoughts, ask questions, reply to other members. Personal correspondence from us comes your way too.' },
              { n: '04', title: 'Leave a review', body: 'When you\'re done, leave a star rating and review. It stays on the book page for future readers.' },
            ].map(s => (
              <div key={s.n} className={styles.howCard}>
                <span className={styles.howNum}>{s.n}</span>
                <h3 className={styles.howTitle}>{s.title}</h3>
                <p className={styles.howBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Past picks ── */}
        {pastPicks.length > 0 && (
          <section className={styles.archiveSection}>
            <h2 className={styles.sectionTitle}>Past picks</h2>
            <div className={styles.archiveGrid}>
              {pastPicks.slice(0, 6).map(p => (
                <Link key={p.id} to={`/books/${p.book_id}`} className={styles.archiveCard}>
                  <div className={styles.archiveCover}>
                    {p.cover_url
                      ? <img src={p.cover_url} alt={p.title} />
                      : <PickPlaceholder title={p.title} small />
                    }
                  </div>
                  <div className={styles.archiveInfo}>
                    <span className={styles.archiveMonth}>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </span>
                    <p className={styles.archiveTitle}>{p.title}</p>
                    <p className={styles.archiveAuthor}>{p.author}</p>
                    {p.avg_rating && (
                      <div className={styles.archiveRating}>
                        <Stars rating={p.avg_rating} small />
                        <span>{Number(p.avg_rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function Stars({ rating, small = false }) {
  const sz = small ? 12 : 16
  return (
    <span style={{ color: 'var(--gold)', fontSize: sz, letterSpacing: '1px' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.22 }}>★</span>
      ))}
    </span>
  )
}

function PickPlaceholder({ title, small = false }) {
  const colors = ['#2d4a3e','#3d2d1a','#1a2d4a','#3d1a2d','#2d3d1a']
  const c = colors[(title.charCodeAt(0) + title.length) % colors.length]
  return (
    <div style={{
      width: '100%', height: '100%',
      background: c,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: small ? 8 : 16,
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: small ? 12 : 18,
        fontWeight: 700,
        color: 'rgba(250,247,242,0.85)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>{title}</span>
    </div>
  )
}
