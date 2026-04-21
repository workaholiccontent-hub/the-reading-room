import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import styles from './AdminMembersPage.module.css'
import { format } from 'date-fns'

const STATUS_OPTIONS = ['active', 'pending', 'suspended', 'expired']

export default function AdminMembersPage() {
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('members')
      .select('*')
      .order('joined_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(memberId, status) {
    setUpdating(true)
    const { error } = await supabase
      .from('members')
      .update({ status })
      .eq('id', memberId)
    if (error) toast.error(error.message)
    else {
      toast.success(`Member ${status}`)
      setSelected(s => s ? { ...s, status } : null)
      load()
    }
    setUpdating(false)
  }

  async function makeAdmin(memberId) {
    setUpdating(true)
    const { error } = await supabase
      .from('members')
      .update({ role: 'admin' })
      .eq('id', memberId)
    if (error) toast.error(error.message)
    else {
      toast.success('Member promoted to admin')
      setSelected(s => s ? { ...s, role: 'admin' } : null)
      load()
    }
    setUpdating(false)
  }

  const filtered = members.filter(m =>
    !search ||
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.membership_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusColors = {
    active:    { bg: 'rgba(90,122,106,0.1)',   color: 'var(--sage)' },
    pending:   { bg: 'rgba(201,168,76,0.12)',  color: 'var(--gold-dark)' },
    suspended: { bg: 'rgba(184,92,56,0.1)',    color: 'var(--rust)' },
    expired:   { bg: 'rgba(122,111,104,0.1)',  color: 'var(--ink-muted)' },
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
      />

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search name, email or membership number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filters}>
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading members…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No members found.</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Name</span>
            <span>Email</span>
            <span>Membership #</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {filtered.map(m => (
            <div key={m.id} className={styles.tableRow} onClick={() => setSelected(m)}>
              <span className={styles.cellPrimary}>
                {m.full_name}
                {m.role === 'admin' && <span className={styles.adminBadge}>admin</span>}
              </span>
              <span className={styles.cellMuted}>{m.email}</span>
              <span className={styles.cellMono}>{m.membership_number || '—'}</span>
              <span>
                <span
                  className={styles.statusPill}
                  style={statusColors[m.status]}
                >
                  {m.status}
                </span>
              </span>
              <span className={styles.cellMuted}>
                {format(new Date(m.joined_at), 'd MMM yyyy')}
              </span>
              <button
                className={styles.viewBtn}
                onClick={e => { e.stopPropagation(); setSelected(m) }}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Member detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Member details"
        maxWidth={500}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className={styles.modalAvatar}>
                {selected.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                  {selected.full_name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{selected.membership_number}</p>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <DetailRow label="Email"   value={selected.email} />
              <DetailRow label="Phone"   value={selected.phone || '—'} />
              <DetailRow label="Status"  value={selected.status} />
              <DetailRow label="Role"    value={selected.role} />
              <DetailRow label="Joined"  value={format(new Date(selected.joined_at), 'd MMMM yyyy')} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid var(--paper-dark)' }}>
              {selected.status !== 'active' && (
                <Button size="sm" variant="primary" loading={updating}
                  onClick={() => updateStatus(selected.id, 'active')}>
                  Approve / Activate
                </Button>
              )}
              {selected.status !== 'suspended' && (
                <Button size="sm" variant="danger" loading={updating}
                  onClick={() => updateStatus(selected.id, 'suspended')}>
                  Suspend
                </Button>
              )}
              {selected.role !== 'admin' && (
                <Button size="sm" variant="secondary" loading={updating}
                  onClick={() => makeAdmin(selected.id)}>
                  Make admin
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--paper-dark)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
