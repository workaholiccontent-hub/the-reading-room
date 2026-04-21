import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useAnalytics() {
  const [loansPerMonth, setLoansPerMonth]   = useState([])
  const [signupsPerMonth, setSignupsPerMonth] = useState([])
  const [topBooks, setTopBooks]             = useState([])
  const [genreStats, setGenreStats]         = useState([])
  const [summary, setSummary]               = useState(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('loans_per_month').select('*'),
      supabase.from('signups_per_month').select('*'),
      supabase.from('top_borrowed_books').select('*').limit(10),
      supabase.from('genre_popularity').select('*'),
      // Summary stats
      Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('loans').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('approved', true),
        supabase.from('discussion_posts').select('*', { count: 'exact', head: true }).eq('approved', true),
      ])
    ]).then(([
      { data: loans },
      { data: signups },
      { data: books },
      { data: genres },
      [
        { count: totalBooks },
        { count: activeMembers },
        { count: activeLoans },
        { count: totalLoans },
        { count: totalReviews },
        { count: totalPosts },
      ]
    ]) => {
      setLoansPerMonth(loans || [])
      setSignupsPerMonth(signups || [])
      setTopBooks(books || [])
      setGenreStats(genres || [])
      setSummary({ totalBooks, activeMembers, activeLoans, totalLoans, totalReviews, totalPosts })
      setLoading(false)
    })
  }, [])

  return { loansPerMonth, signupsPerMonth, topBooks, genreStats, summary, loading }
}
