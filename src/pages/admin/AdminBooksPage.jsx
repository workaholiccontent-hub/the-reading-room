import { useState } from 'react'
import { useBooks, useGenres } from '@/hooks/useBooks'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import styles from './AdminBooksPage.module.css'

const EMPTY_FORM = {
  title: '', author: '', isbn: '', genre: '',
  cover_url: '', description: '',
  total_copies: 1, available_copies: 1, featured: false
}

export default function AdminBooksPage() {
  const [search, setSearch]     = useState('')
  const { books, loading, refetch } = useBooks({ search, limit: 200 })
  const genres = useGenres()

  const [modalOpen, setModalOpen] = useState(false)
  const [editBook, setEditBook]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState(null)

  function openAdd() {
    setEditBook(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(book) {
    setEditBook(book)
    setForm({
      title: book.title, author: book.author, isbn: book.isbn || '',
      genre: book.genre || '', cover_url: book.cover_url || '',
      description: book.description || '',
      total_copies: book.total_copies, available_copies: book.available_copies,
      featured: book.featured
    })
    setModalOpen(true)
  }

  function set(field) {
    return e => {
      const val = e.target.type === 'checkbox' ? e.target.checked
                : e.target.type === 'number'   ? parseInt(e.target.value) || 0
                : e.target.value
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.author.trim()) {
      toast.error('Title and author are required')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      isbn: form.isbn || null,
      genre: form.genre || null,
      cover_url: form.cover_url || null,
      description: form.description || null,
    }
    const { error } = editBook
      ? await supabase.from('books').update(payload).eq('id', editBook.id)
      : await supabase.from('books').insert(payload)

    if (error) toast.error(error.message)
    else { toast.success(editBook ? 'Book updated!' : 'Book added!'); setModalOpen(false); refetch() }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('books').delete().eq('id', deleteId)
    if (error) toast.error(error.message)
    else { toast.success('Book deleted.'); refetch() }
    setDeleteId(null)
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Books"
        subtitle={`${books.length} book${books.length !== 1 ? 's' : ''} in the catalogue`}
        action={<Button variant="primary" onClick={openAdd}>+ Add book</Button>}
      />

      <div className={styles.searchRow}>
        <input
          type="search"
          placeholder="Search by title or author…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? <div className={styles.loading}>Loading books…</div> : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Title</span><span>Author</span><span>Genre</span>
            <span>Copies</span><span>Available</span><span>Actions</span>
          </div>
          {books.map(b => (
            <div key={b.id} className={styles.tableRow}>
              <span className={styles.cellPrimary}>
                {b.featured && <span className={styles.featuredDot} title="Featured" />}
                {b.title}
              </span>
              <span className={styles.cellMuted}>{b.author}</span>
              <span className={styles.cellMuted}>{b.genre || '—'}</span>
              <span className={styles.cellMuted}>{b.total_copies}</span>
              <span className={`${styles.cellMuted} ${b.available_copies === 0 ? styles.noStock : ''}`}>
                {b.available_copies}
              </span>
              <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => openEdit(b)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => setDeleteId(b.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBook ? 'Edit book' : 'Add new book'}
        maxWidth={560}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Title *"  value={form.title}  onChange={set('title')}  required placeholder="Book title" />
            <Input label="Author *" value={form.author} onChange={set('author')} required placeholder="Author name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="ISBN"  value={form.isbn}  onChange={set('isbn')}  placeholder="978-..." />
            <Input label="Genre" value={form.genre} onChange={set('genre')} placeholder="e.g. Fiction" list="genres-list" />
            <datalist id="genres-list">
              {genres.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <Input label="Cover image URL" value={form.cover_url} onChange={set('cover_url')} placeholder="https://..." />
          <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Brief synopsis…" rows={3} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Total copies"     type="number" min="1" value={form.total_copies}     onChange={set('total_copies')} />
            <Input label="Available copies" type="number" min="0" value={form.available_copies} onChange={set('available_copies')} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.featured} onChange={set('featured')} style={{ accentColor: 'var(--gold-dark)' }} />
            Feature this book on the homepage
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>{editBook ? 'Save changes' : 'Add book'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete book?">
        <p style={{ fontSize: 15, color: 'var(--ink-muted)', marginBottom: 24 }}>
          This cannot be undone. Any active loans for this book should be returned first.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
