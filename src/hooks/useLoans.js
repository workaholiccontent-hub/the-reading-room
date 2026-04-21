import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { addDays } from 'date-fns'

export function useMyLoans() {
  const { member } = useAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!member) return
    setLoading(true)
    const { data } = await supabase
      .from('loans')
      .select('*, books(id, title, author, cover_url, genre)')
      .eq('member_id', member.id)
      .order('borrowed_at', { ascending: false })
    setLoans(data || [])
    setLoading(false)
  }, [member])

  useEffect(() => { fetch() }, [fetch])

  async function borrowBook(bookId) {
    if (!member) return
    const dueDate = addDays(new Date(), 14)
    const { error } = await supabase.from('loans').insert({
      member_id: member.id,
      book_id: bookId,
      due_date: dueDate.toISOString(),
      status: 'active'
    })
    if (error) {
      toast.error(error.message)
      return false
    }
    toast.success('Book borrowed! Due back in 14 days.')
    fetch()
    return true
  }

  async function returnBook(loanId) {
    const { error } = await supabase
      .from('loans')
      .update({ returned_at: new Date().toISOString(), status: 'returned' })
      .eq('id', loanId)
    if (error) { toast.error(error.message); return false }
    toast.success('Book returned. Thanks!')
    fetch()
    return true
  }

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue')
  const pastLoans   = loans.filter(l => l.status === 'returned')

  return { loans, activeLoans, pastLoans, loading, borrowBook, returnBook, refetch: fetch }
}
