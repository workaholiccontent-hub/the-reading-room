import { Link } from 'react-router-dom'
import { useBooks } from '@/hooks/useBooks'
import { useActivePick } from '@/hooks/useClub'
import BookCard from '@/components/ui/BookCard'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { books: featured } = useBooks({ featured: true, limit: 4 })
  const { books: recent }   = useBooks({ limit: 8 })
  const { pick }            = useActivePick()

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Community library & book club</span>
            <h1 className={styles.heroTitle}>
              A place for<br />
              <em>curious readers</em>
            </h1>
            <p className={styles.heroSub}>
              Borrow books, track your reading, join discussions,
              and connect with a community that loves stories as much as you do.
            </p>
            <div className={styles.heroCta}>
              <Link to="/signup" className={styles.ctaPrimary}>Join for free</Link>
              <Link to="/catalogue" className={styles.ctaSecondary}>Browse catalogue →</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <BookSpine title="One Hundred Years of Solitude" color="#2d4a3e" />
            <BookSpine title="Americanah"            color="#3d2d1a" rotate={-3} />
            <BookSpine title="Midnight Library"      color="#1a2d4a" rotate={4} />
            <BookSpine title="Things Fall Apart"     color="#4a2d1a" rotate={-6} />
            <BookSpine title="Half of a Yellow Sun"  color="#3d3d1a" rotate={2} />
          </div>
        </div>

        {/* Stats strip */}
        <div className={styles.statsStrip}>
          {[
            ['500+', 'Books available'],
            ['Free', 'To join & borrow'],
            ['14 days', 'Lending period'],
            ['Weekly', 'Club discussions'],
          ].map(([num, label]) => (
            <div key={label} className={styles.stat}>
              <span className={styles.statNum}>{num}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Book club pick banner ── */}
      {pick && (
        <section className={styles.clubBannerSection}>
          <div className={styles.sectionInner}>
            <div className={styles.clubBanner}>
              <div className={styles.clubBannerLeft}>
                <span className={styles.clubBannerEyebrow}>Book club pick · This month</span>
                <h2 className={styles.clubBannerTitle}>{pick.title}</h2>
                <p className={styles.clubBannerAuthor}>by {pick.author}</p>
                {pick.theme && (
                  <p className={styles.clubBannerTheme}>Theme: {pick.theme}</p>
                )}
                <div className={styles.clubBannerActions}>
                  <Link to="/club" className={styles.clubBannerPrimary}>Join the discussion →</Link>
                  <Link to={`/books/${pick.book_id}`} className={styles.clubBannerSecondary}>
                    View book
                  </Link>
                </div>
              </div>
              {pick.cover_url && (
                <div className={styles.clubBannerCover}>
                  <img src={pick.cover_url} alt={pick.title} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured ── */}
      {featured.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Editor's picks</h2>
              <Link to="/catalogue" className={styles.sectionLink}>View all →</Link>
            </div>
            <div className={`${styles.bookGrid} stagger`}>
              {featured.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle} style={{ textAlign: 'center', marginBottom: 48 }}>
            How the library works
          </h2>
          <div className={styles.steps}>
            {[
              { n: '01', title: 'Sign up free',    body: 'Create your member account in under a minute. No fees, ever.' },
              { n: '02', title: 'Browse & borrow', body: 'Explore hundreds of titles. Borrow up to 3 books for 14 days.' },
              { n: '03', title: 'Track your reading', body: 'Log your progress, set goals, and see how far you\'ve come.' },
              { n: '04', title: 'Join the club',   body: 'Read along with the community, share reviews, and join monthly discussions.' },
            ].map(s => (
              <div key={s.n} className={`${styles.step} animate-fadeUp`}>
                <span className={styles.stepNum}>{s.n}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent additions ── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Recently added</h2>
            <Link to="/catalogue" className={styles.sectionLink}>Full catalogue →</Link>
          </div>
          <div className={`${styles.bookGrid} stagger`}>
            {recent.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h2 className={styles.bannerTitle}>Ready to start reading?</h2>
          <p className={styles.bannerSub}>Join hundreds of members already borrowing and discussing.</p>
          <Link to="/signup" className={styles.bannerBtn}>Create your free account</Link>
        </div>
      </section>
    </div>
  )
}

function BookSpine({ title, color, rotate = 0 }) {
  return (
    <div className={styles.spine} style={{
      background: color,
      transform: `rotate(${rotate}deg)`,
    }}>
      <span className={styles.spineText}>{title}</span>
    </div>
  )
}
