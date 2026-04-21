import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Full-text search using Postgres tsvector
export function useSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [debounced, setDebounced] = useState('')

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return }
    setLoading(true)
    supabase
      .rpc('search_books', { query: debounced.trim(), lim: 30 })
      .then(({ data, error }) => {
        if (!error) setResults(data || [])
        setLoading(false)
      })
  }, [debounced])

  return { query, setQuery, results, loading, hasQuery: debounced.trim().length > 0 }
}

// Similar books (same genre)
export function useSimilarBooks(bookId) {
  const [books, setBooks]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    supabase
      .rpc('similar_books', { p_book_id: bookId, lim: 4 })
      .then(({ data }) => {
        setBooks(data || [])
        setLoading(false)
      })
  }, [bookId])

  return { books, loading }
}
