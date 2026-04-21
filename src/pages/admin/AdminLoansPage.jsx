import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import styles from './AdminLoansPage.module.css'
import { format, differenceInDays } from 'date-fns'

export default function AdminLoansPage() {
  const [loans, setLoans]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('active')
  const [search, setSearch]     = useState('')
  const [returning, setReturning] = useState(null)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('active_loans_view')
      .select('*')
      .order('days_remaining', { ascending: true })

    if (filter === 'active')   q = q.gte('days_remaining', 0)
    if (filter === 'overdue')  q = q.lt('days_remaining', 0)

    // If we want returned loans use the base loans table
    if (filter === 'returned') {
      const { data } = await supabase
        .from('loans')
        .select('*, members(full_name, email), books(title, author)')
        .eq('status', 'returned')
        .order('returned_at', { ascending: false })
        .limit(100)
      setLoans(data || [])
      setLoading(false)
      return
    }

    const { data } = await q
    setLoans(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function markReturned(loanId) {
    const { error } = await supabase
      .from('loans')
      .update({ returned_at: new Date().toISOString(), status: 'returned' })
      .eq('id', loanId)
    if (error) toast.error(error.message)
    else { toast.success('Marked as returned.'); load() }
    setReturning(null)
  }

  const filtered = loans.filter(l => {
    if (!search) return true
    const s = search.toLowerCase()
    const name  = (l.full_name || l.members?.full_name || '').toLowerCase()
    const title = (l.title    || l.books?.title         || '').toLowerCase()
    return name.includes(s) || title.includes(s)
  })

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Loans"
        subtitle="All borrowing activity across the library."
      />

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search by member or book…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filters}>
          {[
            { key: 'active',   label: 'Active' },
            { key: 'overdue',  label: 'Overdue' },
            { key: 'returned', label: 'Returned' },
          ].map(f => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading loans…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No loans found.</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Member</span>
            <span>Book</span>
            <span>Borrowed</span>
            <span>Due / Returned</span>
            <span>Status</span>
            {filter !== 'returned' && <span>Action</span>}
          </div>
          {filtered.map(loan => {
            const isReturned = filter === 'returned'
            const memberName = loan.full_name || loan.members?.full_name
            const bookTitle  = loan.title     || loan.books?.title
            const daysLeft   = !isReturned ? loan.days_remaining : null
            const overdue    = daysLeft !== null && daysLeft < 0

            return (
              <div key={loan.id} className={`${styles.tableRow} ${overdue ? styles.overdueRow : ''}`}>
                <span className={styles.cellPrimary}>{memberName}</span>
                <span className={styles.cellMuted}>{bookTitle}</span>
                <span className={styles.cellMuted}>
                  {format(new Date(loan.borrowed_at), 'd MMM yyyy')}
                </span>
                <span className={overdue ? styles.cellOverdue : styles.cellMuted}>
                  {isReturned
                    ? (loan.returned_at ? format(new Date(loan.returned_at), 'd MMM yyyy') : '—')
                    : format(new Date(loan.due_date), 'd MMM yyyy')
                  }
                  {overdue && ` (${Math.abs(daysLeft)}d late)`}
                  {!isReturned && daysLeft === 0 && ' (today)'}
                </span>
                <span>
                  {isReturned ? (
                    <span className={styles.returnedPill}>Returned</span>
                  ) : overdue ? (
                    <span className={styles.overduePill}>Overdue</span>
                  ) : (
                    <span className={styles.activePill}>Active</span>
                  )}
                </span>
                {filter !== 'returned' && (
                  <button
                    className={styles.returnBtn}
                    onClick={() => setReturning(loan.id)}
                    disabled={returning === loan.id}
                  >
                    {returning === loan.id ? 'Returning…' : 'Return'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm return inline — could be a modal, keeping it simple */}
      {returning && (
        <div className={styles.confirmBar}>
          <span>Mark this loan as returned?</span>
          <Button size="sm" variant="primary" onClick={() => markReturned(returning)}>Confirm</Button>
          <Button size="sm" variant="secondary" onClick={() => setReturning(null)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
