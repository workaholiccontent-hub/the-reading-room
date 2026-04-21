import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export function useBookReviews(bookId) {
  const { member } = useAuth()
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    supabase
      .from('reviews')
      .select('*, members(full_name)')
      .eq('book_id', bookId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(data || [])
        if (member) {
          setMyReview((data || []).find(r => r.member_id === member.id) || null)
        }
        setLoading(false)
      })
  }, [bookId, member])

  async function submitReview({ rating, body }) {
    if (!member) return false
    const { error } = await supabase.from('reviews').upsert({
      member_id: member.id,
      book_id: bookId,
      rating,
      body,
      approved: false
    }, { onConflict: 'member_id,book_id' })
    if (error) { toast.error(error.message); return false }
    toast.success('Review submitted! It will appear after approval.')
    return true
  }

  return { reviews, myReview, loading, submitReview }
}
