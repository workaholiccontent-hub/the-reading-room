import { Link } from 'react-router-dom'
import styles from './BookCard.module.css'

export default function BookCard({ book, onBorrow, showBorrowBtn = false }) {
  const available = book.available_copies > 0

  return (
    <article className={`${styles.card} animate-scaleIn`}>
      <Link to={`/books/${book.id}`} className={styles.coverLink}>
        <div className={styles.cover}>
          {book.cover_url
            ? <img src={book.cover_url} alt={book.title} className={styles.coverImg} />
            : <CoverPlaceholder title={book.title} author={book.author} />
          }
          <div className={`${styles.badge} ${available ? styles.available : styles.unavailable}`}>
            {available ? `${book.available_copies} available` : 'All borrowed'}
          </div>
        </div>
      </Link>

      <div className={styles.info}>
        <Link to={`/books/${book.id}`}>
          <h3 className={styles.title}>{book.title}</h3>
        </Link>
        <p className={styles.author}>{book.author}</p>

        {book.genre && <span className={styles.genre}>{book.genre}</span>}

        {book.avg_rating && (
          <div className={styles.rating}>
            <Stars rating={book.avg_rating} />
            <span className={styles.ratingNum}>
              {Number(book.avg_rating).toFixed(1)}
            </span>
            {book.review_count > 0 && (
              <span className={styles.reviewCount}>({book.review_count})</span>
            )}
          </div>
        )}

        {showBorrowBtn && available && onBorrow && (
          <button className={styles.borrowBtn} onClick={() => onBorrow(book)}>
            Borrow this book
          </button>
        )}
      </div>
    </article>
  )
}

function Stars({ rating }) {
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.22 }}>★</span>
      ))}
    </span>
  )
}

function CoverPlaceholder({ title, author }) {
  const colors = ['#2d4a3e','#3d2d1a','#1a2d4a','#3d1a2d','#2d3d1a']
  const colorIdx = (title.charCodeAt(0) + title.length) % colors.length

  return (
    <div className={styles.placeholder} style={{ background: colors[colorIdx] }}>
      <span className={styles.placeholderTitle}>{title}</span>
      <span className={styles.placeholderAuthor}>{author}</span>
    </div>
  )
}
