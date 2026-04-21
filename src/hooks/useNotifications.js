import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function useNotifications() {
  const { member }               = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(true)

  const fetch = useCallback(async () => {
    if (!member) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('member_id', member.id)
      .eq('in_app', true)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.read_at).length)
    setLoading(false)
  }, [member])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    if (!member) return
    const channel = supabase
      .channel(`notifications:${member.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `member_id=eq.${member.id}`,
      }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [member, fetch])

  async function markAllRead() {
    if (!member) return
    await supabase.rpc('mark_notifications_read', { p_member_id: member.id })
    setNotifications(n => n.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
    setUnreadCount(0)
  }

  async function markRead(notificationId) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
    fetch()
  }

  return { notifications, unreadCount, loading, markAllRead, markRead, refetch: fetch }
}
