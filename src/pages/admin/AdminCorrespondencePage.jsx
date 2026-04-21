import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSendCorrespondence } from '@/hooks/useEmail'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Textarea, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import styles from './AdminCorrespondencePage.module.css'
import { format } from 'date-fns'

const PROMPT_TYPES = [
  { value: 'check_in',            label: 'Check-in',            desc: 'A friendly note asking how they\'re finding the book' },
  { value: 'discussion_question', label: 'Discussion question',  desc: 'A thought-provoking question to consider while reading' },
  { value: 'fun_fact',            label: 'Fun fact',             desc: 'An interesting fact about the book, author, or setting' },
  { value: 'author_note',         label: 'Author note',          desc: 'Background on the author and their writing process' },
  { value: 'custom',              label: 'Custom note',          desc: 'Write anything you like' },
]

export default function AdminCorrespondencePage() {
  const { sendCorrespondence, loading: sending } = useSendCorrespondence()

  const [activeReaders, setActiveReaders] = useState([])
  const [allCorrespondences, setAllCorrespondences] = useState([])
  const [loadingReaders, setLoadingReaders] = useState(true)
  const [tab, setTab] = useState('compose')

  // Compose state
  const [selectedReader, setSelectedReader] = useState(null)
  const [promptType, setPromptType] = useState('check_in')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => { loadData() }, [tab])

  async function loadData() {
    setLoadingReaders(true)
    // Members currently reading something
    const { data: readers } = await supabase
      .from('reading_log')
      .select(`
        *,
        members (id, full_name, email, membership_number, status),
        books   (id, title, author, cover_url, genre)
      `)
      .eq('status', 'reading')
      .order('updated_at', { ascending: false })

    setActiveReaders((readers || []).filter(r => r.members?.status === 'active'))

    if (tab === 'history') {
      const { data: corrs } = await supabase
        .from('correspondences')
        .select(`
          *,
          members (full_name, email),
          books   (title, author)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      setAllCorrespondences(corrs || [])
    }

    setLoadingReaders(false)
  }

  function openCompose(reader) {
    setSelectedReader(reader)
    setPromptType('check_in')
    setContent('')
    setComposeOpen(true)
  }

  async function handleSave(sendNow = false) {
    if (!content.trim()) { toast.error('Please write some content'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('correspondences')
        .insert({
          member_id:   selectedReader.members.id,
          book_id:     selectedReader.books.id,
          prompt_type: promptType,
          content:     content.trim(),
          sent:        false,
        })
        .select()
        .single()

      if (error) throw error

      if (sendNow) {
        const ok = await sendCorrespondence(data.id)
        if (ok) setComposeOpen(false)
      } else {
        toast.success('Saved as draft')
        setComposeOpen(false)
      }
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendDraft(corrId) {
    await sendCorrespondence(corrId)
    loadData()
  }

  async function handleDelete(corrId) {
    await supabase.from('correspondences').delete().eq('id', corrId)
    toast.success('Deleted')
    loadData()
  }

  const selectedType = PROMPT_TYPES.find(t => t.value === promptType)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Correspondence"
        subtitle="Send personalised notes to members about the books they're reading."
      />

      <div className={styles.tabs}>
        {[
          { key: 'compose', label: `Active readers (${activeReaders.length})` },
          { key: 'history', label: 'Sent & drafts' },
        ].map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Active readers ── */}
      {tab === 'compose' && (
        loadingReaders ? (
          <p className={styles.loading}>Loading active readers…</p>
        ) : activeReaders.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No members currently reading</p>
            <p className={styles.emptySub}>Members appear here when they add a book to their reading log with "Reading" status.</p>
          </div>
        ) : (
          <div className={styles.readerGrid}>
            {activeReaders.map(r => (
              <ReaderCard key={r.id} reader={r} onCompose={() => openCompose(r)} />
            ))}
          </div>
        )
      )}

      {/* ── History / drafts ── */}
      {tab === 'history' && (
        loadingReaders ? (
          <p className={styles.loading}>Loading…</p>
        ) : allCorrespondences.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No correspondence yet</p>
          </div>
        ) : (
          <div className={styles.histList}>
            {allCorrespondences.map(c => (
              <CorrespondenceRow
                key={c.id}
                corr={c}
                onSend={() => handleSendDraft(c.id)}
                onDelete={() => handleDelete(c.id)}
                sending={sending}
              />
            ))}
          </div>
        )
      )}

      {/* ── Compose modal ── */}
      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Write correspondence"
        maxWidth={560}
      >
        {selectedReader && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Context */}
            <div className={styles.composeContext}>
              <div className={styles.composeMember}>
                <div className={styles.composeAvatar}>
                  {selectedReader.members.full_name.charAt(0)}
                </div>
                <div>
                  <p className={styles.composeMemberName}>{selectedReader.members.full_name}</p>
                  <p className={styles.composeMemberSub}>{selectedReader.members.membership_number}</p>
                </div>
              </div>
              <div className={styles.composeBook}>
                <p className={styles.composeBookTitle}>{selectedReader.books.title}</p>
                <p className={styles.composeBookAuthor}>{selectedReader.books.author}</p>
                {selectedReader.pages_read > 0 && selectedReader.total_pages && (
                  <p className={styles.composeProgress}>
                    {Math.round((selectedReader.pages_read / selectedReader.total_pages) * 100)}% through
                  </p>
                )}
              </div>
            </div>

            <Select
              label="Correspondence type"
              value={promptType}
              onChange={e => setPromptType(e.target.value)}
            >
              {PROMPT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            {selectedType && (
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
                {selectedType.desc}
              </p>
            )}

            <Textarea
              label="Your message"
              placeholder={getPlaceholder(promptType, selectedReader.books.title, selectedReader.books.author)}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
            />

            <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              Separate paragraphs with a blank line. The email will be nicely formatted automatically.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button variant="secondary" loading={saving} onClick={() => handleSave(false)}>Save draft</Button>
              <Button variant="primary" loading={saving || sending} onClick={() => handleSave(true)}>
                Send now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReaderCard({ reader, onCompose }) {
  const pct = reader.total_pages && reader.pages_read
    ? Math.min(100, Math.round((reader.pages_read / reader.total_pages) * 100))
    : null

  return (
    <div className={styles.readerCard}>
      <div className={styles.readerCover}>
        {reader.books.cover_url
          ? <img src={reader.books.cover_url} alt="" />
          : <div className={styles.readerCoverPlaceholder}>{reader.books.title.charAt(0)}</div>
        }
      </div>
      <div className={styles.readerInfo}>
        <p className={styles.readerName}>{reader.members.full_name}</p>
        <p className={styles.readerMem}>{reader.members.membership_number}</p>
        <p className={styles.readerBook}>{reader.books.title}</p>
        <p className={styles.readerAuthor}>{reader.books.author}</p>
        {pct !== null && (
          <div className={styles.readerProgress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.progressPct}>{pct}%</span>
          </div>
        )}
      </div>
      <button className={styles.composeBtn} onClick={onCompose}>
        Write note →
      </button>
    </div>
  )
}

function CorrespondenceRow({ corr, onSend, onDelete, sending }) {
  return (
    <div className={`${styles.histRow} ${!corr.sent ? styles.histDraft : ''}`}>
      <div className={styles.histMain}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className={`${styles.histBadge} ${corr.sent ? styles.histSent : styles.histDraftBadge}`}>
            {corr.sent ? 'Sent' : 'Draft'}
          </span>
          <span className={styles.histType}>{corr.prompt_type.replace(/_/g, ' ')}</span>
        </div>
        <p className={styles.histBook}>{corr.books?.title} — {corr.books?.author}</p>
        <p className={styles.histMember}>to {corr.members?.full_name}</p>
        <p className={styles.histContent}>{corr.content.substring(0, 120)}{corr.content.length > 120 ? '…' : ''}</p>
        <p className={styles.histDate}>{format(new Date(corr.created_at), 'd MMM yyyy')}</p>
      </div>
      {!corr.sent && (
        <div className={styles.histActions}>
          <Button variant="primary" size="sm" loading={sending} onClick={onSend}>Send now</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </div>
  )
}

function getPlaceholder(type, title, author) {
  const map = {
    check_in: `Hi {{name}},\n\nJust checking in on your reading of "${title}". How are you finding it so far?\n\nWe'd love to hear your thoughts — feel free to leave a review on the book page.`,
    discussion_question: `Hi {{name}},\n\nAs you read "${title}", we thought you might enjoy thinking about this:\n\n[Your discussion question here]\n\nThere are no right answers — just interesting ones.`,
    fun_fact: `Hi {{name}},\n\nHere's something interesting about "${title}" by ${author}:\n\n[Your fun fact here]`,
    author_note: `Hi {{name}},\n\nWhile you're reading "${title}", here's a little background on ${author}:\n\n[Author background here]`,
    custom: `Hi {{name}},\n\n[Your message here]`,
  }
  return map[type] || map.custom
}
