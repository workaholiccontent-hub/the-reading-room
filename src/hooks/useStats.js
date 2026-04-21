import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// ── Leaderboard ───────────────────────────────────────────────────────────
export function useLeaderboard(category = 'books_read') {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const viewMap = {
      books_read:   'leaderboard_books_read',
      reviewers:    'leaderboard_reviewers',
      contributors: 'leaderboard_contributors',
    }
    const view = viewMap[category] || 'leaderboard_books_read'
    supabase
      .from(view)
      .select('*')
      .limit(20)
      .then(({ data: rows }) => {
        setData(rows || [])
        setLoading(false)
      })
  }, [category])

  return { data, loading }
}

// ── My full stats ─────────────────────────────────────────────────────────
export function useMyStats() {
  const { member }            = useAuth()
  const [stats, setStats]     = useState(null)
  const [rank, setRank]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!member) return
    Promise.all([
      supabase
        .from('member_stats_view')
        .select('*')
        .eq('member_id', member.id)
        .single(),

      // Rank by books finished
      supabase
        .from('leaderboard_books_read')
        .select('id')
        .then(({ data: rows }) => {
          if (!rows) return null
          const idx = rows.findIndex(r => r.id === member.id)
          return idx >= 0 ? idx + 1 : null
        }),
    ]).then(([{ data: s }, r]) => {
      setStats(s)
      setRank(r)
      setLoading(false)
    })
  }, [member])

  return { stats, rank, loading }
}

// ── Achievements ──────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  {
    id:    'first_borrow',
    title: 'First chapter',
    desc:  'Borrowed your first book',
    icon:  '📖',
    check: (s) => s.total_loans >= 1,
  },
  {
    id:    'bookworm',
    title: 'Bookworm',
    desc:  'Finished 5 books',
    icon:  '🐛',
    check: (s) => s.books_finished >= 5,
  },
  {
    id:    'avid_reader',
    title: 'Avid reader',
    desc:  'Finished 20 books',
    icon:  '🦋',
    check: (s) => s.books_finished >= 20,
  },
  {
    id:    'century',
    title: 'Page turner',
    desc:  'Read 10,000 pages',
    icon:  '📚',
    check: (s) => s.total_pages_read >= 10000,
  },
  {
    id:    'critic',
    title: 'Literary critic',
    desc:  'Written 3 approved reviews',
    icon:  '✍️',
    check: (s) => s.reviews_written >= 3,
  },
  {
    id:    'voice',
    title: 'Finding your voice',
    desc:  '10 discussion posts',
    icon:  '💬',
    check: (s) => s.discussion_posts >= 10,
  },
  {
    id:    'conversationalist',
    title: 'Conversationalist',
    desc:  'Joined 5 different discussions',
    icon:  '🗣️',
    check: (s) => s.discussions_joined >= 5,
  },
  {
    id:    'loyal',
    title: 'Loyal member',
    desc:  'Member for over a year',
    icon:  '🏛️',
    check: (s, member) => {
      if (!member?.joined_at) return false
      const diff = Date.now() - new Date(member.joined_at).getTime()
      return diff > 365 * 24 * 60 * 60 * 1000
    },
  },
]

export function computeAchievements(stats, member) {
  if (!stats) return []
  return ACHIEVEMENTS.map(a => ({
    ...a,
    earned: a.check(stats, member),
  }))
}

// ── Admin waitlist view ───────────────────────────────────────────────────
export function useWaitlist() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pending_waitlist_view')
      .select('*')
      .order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])
  return { items, loading, refetch: fetch }
}
