import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useBook } from '@/hooks/useBooks'
import { useBookReviews } from '@/hooks/useReviews'
import { useMyLoans } from '@/hooks/useLoans'
import { useReservations } from '@/hooks/useReservations'
import { useSimilarBooks } from '@/hooks/useSearch'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import BookCard from '@/components/ui/BookCard'
import Modal from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'
import styles from './BookDetailPage.module.css'

export default function BookDetailPage() {
  const { id } = useParams()
  const { book, loading } = useBook(id)
  const { reviews, myReview, submitReview } = useBookReviews(id)
  const { borrowBook } = useMyLoans()
  const { reserve } = useReservations()
  const { user, member, isActive } = useAuth()
  const { books: similarBooks } = useSimilarBooks(id)

  const [reviewOpen, setReviewOpen]   = useState(false)
  const [rating, setRating]           = useState(5)
  const [body, setBody]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [borrowing, setBorrowing]     = useState(false)
  const [reserving, setReserving]     = useState(false)

  if (loading) return <div className={styles.loading}>Loading…</div>
  if (!book)   return <div className={styles.loading}>Book not found.</div>

  const available = book.available_copies > 0

  async function handleBorrow() {
    setBorrowing(true)
    await borrowBook(book.id)
    setBorrowing(false)
  }

  async function handleReserve() {
    setReserving(true)
    await reserve(book.id)
    setReserving(false)
  }

  async function handleReview(e) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await submitReview({ rating, body })
    setSubmitting(false)
    if (ok) { setReviewOpen(false); setBody(''); setRating(5) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/catalogue">Catalogue</Link>
          <span>/</span>
          <span>{book.title}</span>
        </nav>

        {/* Book header */}
        <div className={styles.bookHeader}>
          <div className={styles.coverWrap}>
            {book.cover_url
              ? <img src={book.cover_url} alt={book.title} className={styles.cover} />
              : <PlaceholderCover title={book.title} author={book.author} />
            }
          </div>

          <div className={styles.bookInfo}>
            {book.genre && <span className={styles.genre}>{book.genre}</span>}
            <h1 className={styles.title}>{book.title}</h1>
            <p className={styles.author}>by {book.author}</p>

            {book.isbn && (
              <p className={styles.isbn}>ISBN: {book.isbn}</p>
            )}

            {/* Rating */}
            {book.avg_rating && (
              <div className={styles.ratingRow}>
                <Stars rating={book.avg_rating} size="lg" />
                <span className={styles.ratingVal}>{Number(book.avg_rating).toFixed(1)}</span>
                <span className={styles.ratingCount}>
                  {book.review_count} review{book.review_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Availability */}
            <div className={`${styles.availBadge} ${available ? styles.yes : styles.no}`}>
              {available
                ? `${book.available_copies} of ${book.total_copies} available`
                : `All ${book.total_copies} copies borrowed`
              }
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              {!user ? (
                <>
                  <Link to="/login" className={styles.actionLink}>
                    Sign in to borrow
                  </Link>
                  <Link to="/signup" className={styles.actionLinkSub}>
                    Not a member? Join free →
                  </Link>
                </>
              ) : !isActive ? (
                <p className={styles.pendingNote}>
                  Your membership is pending approval. You'll be able to borrow soon.
                </p>
              ) : available ? (
                <Button variant="primary" size="lg" loading={borrowing} onClick={handleBorrow}>
                  Borrow this book
                </Button>
              ) : (
                <Button variant="secondary" size="lg" loading={reserving} onClick={handleReserve}>
                  Reserve — join the queue
                </Button>
              )}

              {user && isActive && !myReview && (
                <Button variant="secondary" onClick={() => setReviewOpen(true)}>
                  Write a review
                </Button>
              )}
            </div>

            {book.description && (
              <div className={styles.description}>
                <h2 className={styles.descTitle}>About this book</h2>
                <p>{book.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section className={styles.reviewsSection}>
          <h2 className={styles.reviewsTitle}>
            Reviews
            {reviews.length > 0 && <span className={styles.reviewsCount}>{reviews.length}</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className={styles.noReviews}>
              <p>No reviews yet. {user ? 'Be the first!' : 'Sign in to leave one.'}</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map(r => (
                <div key={r.id} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewer}>{r.members?.full_name}</span>
                    <Stars rating={r.rating} size="sm" />
                    <span className={styles.reviewDate}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  {r.body && <p className={styles.reviewBody}>{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Similar books */}
        {similarBooks.length > 0 && (
          <section className={styles.similarSection}>
            <h2 className={styles.similarTitle}>You might also like</h2>
            <div className={styles.similarGrid}>
              {similarBooks.map(b => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Write a review">
        <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-light)', display: 'block', marginBottom: 8 }}>
              Your rating
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n} type="button"
                  onClick={() => setRating(n)}
                  style={{
                    fontSize: 28,
                    color: n <= rating ? 'var(--gold)' : 'var(--paper-dark)',
                    transition: 'color 0.15s',
                    padding: '0 2px',
                  }}
                >★</button>
              ))}
            </div>
          </div>
          <Textarea
            label="Your thoughts (optional)"
            placeholder="What did you think of this book?"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReviewOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>Submit review</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Stars({ rating, size = 'md' }) {
  const sz = size === 'lg' ? 22 : size === 'sm' ? 13 : 16
  return (
    <span style={{ color: 'var(--gold)', fontSize: sz, letterSpacing: '1px' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.22 }}>★</span>
      ))}
    </span>
  )
}

function PlaceholderCover({ title, author }) {
  const colors = ['#2d4a3e','#3d2d1a','#1a2d4a','#3d1a2d','#2d3d1a']
  const c = colors[(title.charCodeAt(0) + title.length) % colors.length]
  return (
    <div className={styles.placeholder} style={{ background: c }}>
      <span className={styles.placeholderTitle}>{title}</span>
      <span className={styles.placeholderAuthor}>{author}</span>
    </div>
  )
}
