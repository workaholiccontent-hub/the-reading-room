import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

// ── Active club pick ──────────────────────────────────────────────────────
export function useActivePick() {
  const [pick, setPick]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('active_club_pick_view')
      .select('*')
      .single()
      .then(({ data }) => {
        setPick(data || null)
        setLoading(false)
      })
  }, [])

  return { pick, loading }
}

// ── All club picks (archive) ──────────────────────────────────────────────
export function useClubPicks() {
  const [picks, setPicks]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('club_picks_view')
      .select('*')
    setPicks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { picks, loading, refetch: fetch }
}

// ── Discussions for a pick or book ────────────────────────────────────────
export function useDiscussions({ clubPickId, bookId } = {}) {
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading]         = useState(true)
  const { member }                    = useAuth()

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('discussions_view').select('*')
    if (clubPickId) q = q.eq('club_pick_id', clubPickId)
    if (bookId)     q = q.eq('book_id', bookId)
    const { data } = await q
    setDiscussions(data || [])
    setLoading(false)
  }, [clubPickId, bookId])

  useEffect(() => { fetch() }, [fetch])

  async function createDiscussion(title, clubPickId_, bookId_) {
    if (!member) return null
    const { data, error } = await supabase
      .from('discussions')
      .insert({
        title,
        club_pick_id: clubPickId_ || null,
        book_id:      bookId_     || null,
        created_by:   member.id,
      })
      .select()
      .single()
    if (error) { toast.error(error.message); return null }
    toast.success('Discussion started!')
    fetch()
    return data
  }

  return { discussions, loading, createDiscussion, refetch: fetch }
}

// ── Posts inside a discussion ─────────────────────────────────────────────
export function usePosts(discussionId) {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const { member }            = useAuth()

  const fetch = useCallback(async () => {
    if (!discussionId) return
    setLoading(true)
    const { data } = await supabase
      .from('discussion_posts_view')
      .select('*')
      .eq('discussion_id', discussionId)
    setPosts(data || [])
    setLoading(false)
  }, [discussionId])

  useEffect(() => { fetch() }, [fetch])

  // Subscribe to realtime inserts so discussion feels live
  useEffect(() => {
    if (!discussionId) return
    const channel = supabase
      .channel(`posts:${discussionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'discussion_posts',
        filter: `discussion_id=eq.${discussionId}`,
      }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [discussionId, fetch])

  async function addPost(body, parentId = null) {
    if (!member) return false
    const { error } = await supabase.from('discussion_posts').insert({
      discussion_id: discussionId,
      member_id:     member.id,
      body:          body.trim(),
      parent_id:     parentId || null,
    })
    if (error) { toast.error(error.message); return false }
    fetch()
    return true
  }

  async function editPost(postId, body) {
    const { error } = await supabase
      .from('discussion_posts')
      .update({ body: body.trim(), edited: true })
      .eq('id', postId)
    if (error) { toast.error(error.message); return false }
    fetch()
    return true
  }

  async function flagPost(postId) {
    await supabase
      .from('discussion_posts')
      .update({ flagged: true })
      .eq('id', postId)
    toast.success('Post flagged for review.')
    fetch()
  }

  async function toggleLike(postId) {
    if (!member) return
    const existing = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('member_id', member.id)
      .single()

    if (existing.data) {
      await supabase.from('post_reactions').delete().eq('id', existing.data.id)
    } else {
      await supabase.from('post_reactions').insert({
        post_id:   postId,
        member_id: member.id,
        reaction:  'like',
      })
    }
    fetch()
  }

  // Nest replies under their parent
  const topLevel = posts.filter(p => !p.parent_id)
  const replies  = posts.filter(p =>  p.parent_id)
  const tree     = topLevel.map(p => ({
    ...p,
    replies: replies.filter(r => r.parent_id === p.id),
  }))

  return { posts, tree, loading, addPost, editPost, flagPost, toggleLike, refetch: fetch }
}

// ── Admin club management ─────────────────────────────────────────────────
export function useClubAdmin() {
  const { picks, loading, refetch } = useClubPicks()

  async function setPick(bookId, month, year, theme, guide) {
    // Deactivate current
    await supabase.from('club_picks').update({ active: false }).eq('active', true)
    // Upsert new
    const { error } = await supabase.from('club_picks').upsert({
      book_id:          bookId,
      month:            parseInt(month),
      year:             parseInt(year),
      theme:            theme  || null,
      discussion_guide: guide  || null,
      active:           true,
    }, { onConflict: 'month,year' })
    if (error) { toast.error(error.message); return false }
    toast.success('Club pick updated!')
    refetch()
    return true
  }

  async function archivePick(pickId) {
    await supabase.from('club_picks').update({ active: false }).eq('id', pickId)
    toast.success('Pick archived.')
    refetch()
  }

  async function toggleLock(discussionId, locked) {
    await supabase.from('discussions').update({ locked }).eq('id', discussionId)
    toast.success(locked ? 'Discussion locked.' : 'Discussion unlocked.')
  }

  async function hidePost(postId) {
    await supabase.from('discussion_posts').update({ approved: false }).eq('id', postId)
    toast.success('Post hidden.')
  }

  async function approvePost(postId) {
    await supabase.from('discussion_posts').update({ approved: true, flagged: false }).eq('id', postId)
    toast.success('Post approved.')
  }

  return { picks, loading, setPick, archivePick, toggleLock, hidePost, approvePost, refetch }
}
