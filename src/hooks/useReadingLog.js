import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export function useReadingLog() {
  const { member } = useAuth()
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!member) return
    setLoading(true)
    const { data } = await supabase
      .from('reading_log')
      .select('*, books(id, title, author, cover_url, genre, description)')
      .eq('member_id', member.id)
      .order('updated_at', { ascending: false })
    setLog(data || [])
    setLoading(false)
  }, [member])

  useEffect(() => { fetch() }, [fetch])

  async function addEntry(bookId, totalPages) {
    const { error } = await supabase.from('reading_log').upsert({
      member_id: member.id,
      book_id: bookId,
      total_pages: totalPages || null,
      status: 'reading',
      started_at: new Date().toISOString()
    }, { onConflict: 'member_id,book_id' })
    if (error) { toast.error(error.message); return false }
    toast.success('Added to reading log!')
    fetch()
    return true
  }

  async function updateProgress(entryId, { pagesRead, status, finishedAt }) {
    const updates = {}
    if (pagesRead !== undefined) updates.pages_read = pagesRead
    if (status) updates.status = status
    if (finishedAt) updates.finished_at = finishedAt
    if (status === 'finished') updates.finished_at = new Date().toISOString()

    const { error } = await supabase
      .from('reading_log')
      .update(updates)
      .eq('id', entryId)
    if (error) { toast.error(error.message); return false }
    toast.success('Progress updated!')
    fetch()
    return true
  }

  const currentlyReading = log.filter(e => e.status === 'reading')
  const finished         = log.filter(e => e.status === 'finished')
  const wantToRead       = log.filter(e => e.status === 'want_to_read')

  return { log, currentlyReading, finished, wantToRead, loading, addEntry, updateProgress, refetch: fetch }
}
