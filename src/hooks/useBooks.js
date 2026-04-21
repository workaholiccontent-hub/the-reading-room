import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useBooks({ search = '', genre = '', featured = false, limit = 50 } = {}) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    let q = supabase
      .from('catalogue_view')
      .select('*')
      .order('title')
      .limit(limit)

    if (search) q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
    if (genre)  q = q.eq('genre', genre)
    if (featured) q = q.eq('featured', true)

    const { data, error: err } = await q
    if (err) setError(err.message)
    else setBooks(data || [])
    setLoading(false)
  }, [search, genre, featured, limit])

  useEffect(() => { fetch() }, [fetch])

  return { books, loading, error, refetch: fetch }
}

export function useBook(id) {
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('catalogue_view')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setBook(data)
        setLoading(false)
      })
  }, [id])

  return { book, loading, error }
}

export function useGenres() {
  const [genres, setGenres] = useState([])
  useEffect(() => {
    supabase
      .from('books')
      .select('genre')
      .not('genre', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map(b => b.genre))].sort()
        setGenres(unique)
      })
  }, [])
  return genres
}
