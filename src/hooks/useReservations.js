import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export function useReservations() {
  const { member } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!member) return
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*, books(id, title, author, cover_url, available_copies)')
      .eq('member_id', member.id)
      .order('reserved_at', { ascending: false })
    setReservations(data || [])
    setLoading(false)
  }, [member])

  useEffect(() => { fetch() }, [fetch])

  async function reserve(bookId, notes = '') {
    // check no duplicate pending
    const existing = reservations.find(
      r => r.book_id === bookId && r.status === 'pending'
    )
    if (existing) { toast.error('You already have a reservation for this book.'); return false }

    const { error } = await supabase.from('reservations').insert({
      member_id: member.id,
      book_id: bookId,
      notes: notes || null
    })
    if (error) { toast.error(error.message); return false }
    toast.success('Reservation placed! We\'ll notify you when it\'s ready.')
    fetch()
    return true
  }

  async function cancel(reservationId) {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId)
    if (error) { toast.error(error.message); return false }
    toast.success('Reservation cancelled.')
    fetch()
    return true
  }

  const pending   = reservations.filter(r => r.status === 'pending')
  const fulfilled = reservations.filter(r => r.status === 'fulfilled')

  return { reservations, pending, fulfilled, loading, reserve, cancel, refetch: fetch }
}
