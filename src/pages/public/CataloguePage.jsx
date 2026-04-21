import { useState, useEffect } from 'react'
import { useBooks, useGenres } from '@/hooks/useBooks'
import BookCard from '@/components/ui/BookCard'
import styles from './CataloguePage.module.css'

export default function CataloguePage() {
  const [search, setSearch]   = useState('')
  const [genre, setGenre]     = useState('')
  const [avail, setAvail]     = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const { books, loading } = useBooks({ search: debouncedSearch, genre })
  const genres = useGenres()

  const displayed = avail ? books.filter(b => b.available_copies > 0) : books

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHead}>
          <h1 className={styles.title}>Catalogue</h1>
          <p className={styles.sub}>
            {loading ? 'Loading…' : `${displayed.length} book${displayed.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              placeholder="Search by title or author…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className={styles.genreSelect}
          >
            <option value="">All genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <label className={styles.availToggle}>
            <input
              type="checkbox"
              checked={avail}
              onChange={e => setAvail(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Available now</span>
          </label>

          {(search || genre || avail) && (
            <button
              onClick={() => { setSearch(''); setGenre(''); setAvail(false) }}
              className={styles.clearBtn}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No books found</p>
            <p className={styles.emptySub}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className={`${styles.grid} stagger`}>
            {displayed.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
