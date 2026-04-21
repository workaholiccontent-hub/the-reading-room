import { Link } from 'react-router-dom'
import styles from './AboutPage.module.css'

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Our story</span>
          <h1 className={styles.title}>About the Reading Room</h1>
          <p className={styles.lead}>
            A community library built on the belief that great books should be accessible to everyone.
          </p>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>What we are</h2>
            <p>
              The Reading Room is a community-run lending library and book club. We curate a collection of fiction,
              non-fiction, and everything in between — and we lend it all out, free of charge, to our members.
            </p>
            <p>
              Beyond just borrowing books, we're a place to track what you read, share reviews, and join
              monthly discussions with fellow readers who love books as much as you do.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Membership</h2>
            <p>
              Membership is completely free. Once you sign up and your account is approved, you can borrow
              up to 3 books at a time for 14 days each. Renew, return, or reserve — all from your member dashboard.
            </p>
          </section>

          <section className={styles.section}>
            <h2>The book club</h2>
            <p>
              Each month we pick a featured title and open it up for discussion. Members leave reviews,
              share notes, and receive curated correspondence about the book — think author background,
              discussion questions, and historical context, delivered right to your inbox.
            </p>
          </section>
        </div>

        <div className={styles.cta}>
          <h2>Ready to join?</h2>
          <p>It takes under two minutes to sign up.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <Link to="/signup" className={styles.ctaPrimary}>Join free</Link>
            <Link to="/catalogue" className={styles.ctaSecondary}>Browse catalogue</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
