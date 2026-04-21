import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function useMyActivity(limit = 20) {
  const { member }          = useAuth()
  const [feed, setFeed]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!member) return
    supabase
      .from('member_activity_view')
      .select('*')
      .eq('member_id', member.id)
      .not('created_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setFeed(data || [])
        setLoading(false)
      })
  }, [member, limit])

  return { feed, loading }
}

// Admin: recent activity across ALL members
export function useRecentActivity(limit = 30) {
  const [feed, setFeed]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('member_activity_view')
      .select(`*, members(full_name, membership_number)`)
      .not('created_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setFeed(data || [])
        setLoading(false)
      })
  }, [limit])

  return { feed, loading }
}
