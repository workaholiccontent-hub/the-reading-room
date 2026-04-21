import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivePick, useDiscussions, usePosts } from '@/hooks/useClub'
import { useAuth } from '@/context/AuthContext'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import styles from './ClubPage.module.css'
import { format, formatDistanceToNow } from 'date-fns'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

export default function ClubPage() {
  const { pick, loading: pickLoading } = useActivePick()
  const { discussions, createDiscussion } = useDiscussions({
    clubPickId: pick?.id
  })
  const { member } = useAuth()

  const [activeDiscussion, setActiveDiscussion] = useState(null)
  const [newDiscOpen, setNewDiscOpen]           = useState(false)
  const [newDiscTitle, setNewDiscTitle]         = useState('')
  const [creating, setCreating]                 = useState(false)

  async function handleCreateDiscussion(e) {
    e.preventDefault()
    if (!newDiscTitle.trim()) return
    setCreating(true)
    const disc = await createDiscussion(newDiscTitle.trim(), pick?.id, pick?.book_id)
    setCreating(false)
    if (disc) {
      setNewDiscOpen(false)
      setNewDiscTitle('')
      setActiveDiscussion(disc.id)
    }
  }

  if (pickLoading) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="Book Club" subtitle="Loading this month's pick…" />
        <div className={styles.loadingSkeleton} />
      </div>
    )
  }

  if (!pick) {
    return (
      <div className="animate-fadeIn">
        <PageHeader title="Book Club" />
        <div className={styles.noPick}>
          <p className={styles.noPickTitle}>No active pick this month</p>
          <p className={styles.noPickSub}>Check back soon — the next pick will be announced shortly.</p>
          <Link to="/club">
            <Button variant="secondary" style={{ marginTop: 16 }}>View club page →</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Book Club"
        subtitle={`${MONTH_NAMES[pick.month - 1]} ${pick.year}`}
      />

      {/* Current book banner */}
      <div className={styles.pickBanner}>
        <div className={styles.pickCoverThumb}>
          {pick.cover_url
            ? <img src={pick.cover_url} alt={pick.title} />
            : <div className={styles.coverInit}>{pick.title.charAt(0)}</div>
          }
        </div>
        <div className={styles.pickBannerInfo}>
          <span className={styles.pickBannerEyebrow}>This month's pick</span>
          <h2 className={styles.pickBannerTitle}>{pick.title}</h2>
          <p className={styles.pickBannerAuthor}>by {pick.author}</p>
          {pick.theme && (
            <p className={styles.pickBannerTheme}>
              <span>Theme:</span> {pick.theme}
            </p>
          )}
        </div>
        <div className={styles.pickBannerActions}>
          <Link to={`/books/${pick.book_id}`}>
            <Button variant="secondary" size="sm">View & borrow →</Button>
          </Link>
        </div>
      </div>

      {/* Discussion guide */}
      {pick.discussion_guide && (
        <details className={styles.guideDetails}>
          <summary className={styles.guideSummary}>
            Discussion guide
            <span className={styles.guideCaret}>▾</span>
          </summary>
          <div className={styles.guideBody}>
            {pick.discussion_guide.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </details>
      )}

      {/* Discussions panel */}
      <div className={styles.layout}>

        {/* Left — thread list */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <h3 className={styles.sidebarTitle}>Discussions</h3>
            <button className={styles.newDiscBtn} onClick={() => setNewDiscOpen(true)}>
              + New
            </button>
          </div>
          <div className={styles.threadList}>
            {discussions.length === 0 ? (
              <p className={styles.noThreads}>No discussions yet. Start one!</p>
            ) : discussions.map(d => (
              <button
                key={d.id}
                className={`${styles.threadItem} ${activeDiscussion === d.id ? styles.threadActive : ''}`}
                onClick={() => setActiveDiscussion(d.id)}
              >
                {d.pinned && <span className={styles.pinIcon} title="Pinned">📌</span>}
                <div className={styles.threadItemContent}>
                  <p className={styles.threadItemTitle}>{d.title}</p>
                  <div className={styles.threadItemMeta}>
                    <span>{d.post_count || 0} posts</span>
                    {d.last_post_at && (
                      <span>· {formatDistanceToNow(new Date(d.last_post_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>
                {d.locked && <span className={styles.lockIcon} title="Locked">🔒</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* Right — active thread */}
        <div className={styles.threadPane}>
          {!activeDiscussion ? (
            <div className={styles.noThread}>
              <p>Select a discussion to read and reply, or start a new one.</p>
            </div>
          ) : (
            <ThreadView
              discussionId={activeDiscussion}
              discussion={discussions.find(d => d.id === activeDiscussion)}
              member={member}
            />
          )}
        </div>
      </div>

      {/* New discussion modal */}
      <Modal open={newDiscOpen} onClose={() => setNewDiscOpen(false)} title="Start a discussion">
        <form onSubmit={handleCreateDiscussion} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Discussion title"
            placeholder="What do you want to talk about?"
            value={newDiscTitle}
            onChange={e => setNewDiscTitle(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setNewDiscOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Start discussion</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Thread view with posts ────────────────────────────────────────────────
function ThreadView({ discussionId, discussion, member }) {
  const { tree, loading, addPost, editPost, flagPost, toggleLike } = usePosts(discussionId)
  const [body, setBody]           = useState('')
  const [posting, setPosting]     = useState(false)
  const [replyTo, setReplyTo]     = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody]   = useState('')

  const locked = discussion?.locked

  async function handlePost(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    const ok = await addPost(body.trim(), replyTo)
    setPosting(false)
    if (ok) { setBody(''); setReplyTo(null) }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editBody.trim()) return
    await editPost(editingId, editBody)
    setEditingId(null)
    setEditBody('')
  }

  if (loading) return <div className={styles.threadLoading}>Loading posts…</div>

  return (
    <div className={styles.thread}>
      <div className={styles.threadHeader}>
        <h2 className={styles.threadTitle}>{discussion?.title}</h2>
        <span className={styles.threadMeta}>
          {tree.length} post{tree.length !== 1 ? 's' : ''}
          {locked && <span className={styles.lockedNote}> · Locked</span>}
        </span>
      </div>

      {/* Posts */}
      <div className={styles.posts}>
        {tree.length === 0 ? (
          <div className={styles.noPosts}>
            <p>No posts yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          tree.map(post => (
            <PostCard
              key={post.id}
              post={post}
              member={member}
              onReply={() => setReplyTo(post.id)}
              onEdit={() => { setEditingId(post.id); setEditBody(post.body) }}
              onFlag={() => flagPost(post.id)}
              onLike={() => toggleLike(post.id)}
              editingId={editingId}
              editBody={editBody}
              setEditBody={setEditBody}
              onEditSubmit={handleEdit}
              onEditCancel={() => setEditingId(null)}
              isReplying={replyTo === post.id}
              onCancelReply={() => setReplyTo(null)}
              addPost={addPost}
            />
          ))
        )}
      </div>

      {/* Compose */}
      {!locked ? (
        <form onSubmit={handlePost} className={styles.composeBox}>
          {replyTo && (
            <div className={styles.replyingTo}>
              <span>Replying to a post</span>
              <button type="button" onClick={() => setReplyTo(null)} className={styles.cancelReply}>
                Cancel
              </button>
            </div>
          )}
          <Textarea
            placeholder={replyTo ? 'Write your reply…' : 'Share your thoughts…'}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button type="submit" variant="primary" size="sm" loading={posting} disabled={!body.trim()}>
              {replyTo ? 'Post reply' : 'Post'}
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.lockedBox}>
          This discussion has been locked by an admin.
        </div>
      )}
    </div>
  )
}

// ── Single post card ──────────────────────────────────────────────────────
function PostCard({
  post, member,
  onReply, onEdit, onFlag, onLike,
  editingId, editBody, setEditBody, onEditSubmit, onEditCancel,
  isReplying, addPost,
}) {
  const isOwn    = member?.id === post.member_id
  const isEditing = editingId === post.id

  return (
    <div className={`${styles.post} animate-fadeUp`}>
      <div className={styles.postAvatar}>
        {post.full_name?.charAt(0).toUpperCase()}
      </div>
      <div className={styles.postBody}>
        <div className={styles.postHeader}>
          <span className={styles.postAuthor}>{post.full_name}</span>
          <span className={styles.postMem}>{post.membership_number}</span>
          <span className={styles.postDate}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            {post.edited && <span className={styles.editedNote}> (edited)</span>}
          </span>
        </div>

        {isEditing ? (
          <form onSubmit={onEditSubmit} style={{ marginTop: 8 }}>
            <Textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button type="button" variant="secondary" size="sm" onClick={onEditCancel}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm">Save</Button>
            </div>
          </form>
        ) : (
          <p className={styles.postText}>{post.body}</p>
        )}

        <div className={styles.postActions}>
          <button
            className={`${styles.likeBtn} ${post.like_count > 0 ? styles.liked : ''}`}
            onClick={onLike}
          >
            ♥ {post.like_count > 0 ? post.like_count : ''}
          </button>
          {!isEditing && (
            <button className={styles.postAction} onClick={onReply}>Reply</button>
          )}
          {isOwn && !isEditing && (
            <button className={styles.postAction} onClick={onEdit}>Edit</button>
          )}
          {!isOwn && (
            <button className={`${styles.postAction} ${styles.flagAction}`} onClick={onFlag}>
              Flag
            </button>
          )}
        </div>

        {/* Replies */}
        {post.replies?.length > 0 && (
          <div className={styles.replies}>
            {post.replies.map(reply => (
              <div key={reply.id} className={styles.reply}>
                <div className={styles.replyAvatar}>
                  {reply.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className={styles.replyBody}>
                  <div className={styles.postHeader}>
                    <span className={styles.postAuthor}>{reply.full_name}</span>
                    <span className={styles.postDate}>
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={styles.postText}>{reply.body}</p>
                  <div className={styles.postActions}>
                    <button
                      className={`${styles.likeBtn} ${reply.like_count > 0 ? styles.liked : ''}`}
                      onClick={() => onLike(reply.id)}
                    >
                      ♥ {reply.like_count > 0 ? reply.like_count : ''}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
