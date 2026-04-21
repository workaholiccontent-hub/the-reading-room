import { useEffect, useRef } from 'react'
import { useSearch } from '@/hooks/useSearch'
import { Link } from 'react-router-dom'
import styles from './GlobalSearch.module.css'

export default function GlobalSearch({ onClose }) {
  const { query, setQuery, results, loading, hasQuery } = useSearch()
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search by title, author, genre…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          <button className={styles.closeBtn} onClick={onClose}>
            <kbd>esc</kbd>
          </button>
        </div>

        <div className={styles.body}>
          {!hasQuery ? (
            <div className={styles.hint}>
              <p>Start typing to search the full catalogue.</p>
              <p>Searches titles, authors, genres, and descriptions.</p>
            </div>
          ) : loading ? (
            <div className={styles.loadingRow}>
              <span className={styles.spinner} />
              <span>Searching…</span>
            </div>
          ) : results.length === 0 ? (
            <div className={styles.noResults}>
              <p>No books found for <strong>"{query}"</strong></p>
              <p>Try a different term or check the spelling.</p>
            </div>
          ) : (
            <div className={styles.results}>
              <p className={styles.resultCount}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map(book => (
                <Link
                  key={book.id}
                  to={`/books/${book.id}`}
                  className={styles.result}
                  onClick={onClose}
                >
                  <div className={styles.resultCover}>
                    {book.cover_url
                      ? <img src={book.cover_url} alt="" />
                      : <div className={styles.resultCoverInit}>{book.title.charAt(0)}</div>
                    }
                  </div>
                  <div className={styles.resultInfo}>
                    <p className={styles.resultTitle}>{book.title}</p>
                    <p className={styles.resultAuthor}>{book.author}</p>
                    {book.genre && <span className={styles.resultGenre}>{book.genre}</span>}
                  </div>
                  <div className={styles.resultRight}>
                    <span className={`${styles.availPill} ${book.available_copies > 0 ? styles.available : styles.unavailable}`}>
                      {book.available_copies > 0 ? `${book.available_copies} available` : 'Borrowed'}
                    </span>
                    {book.avg_rating && (
                      <span className={styles.resultRating}>★ {Number(book.avg_rating).toFixed(1)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
