import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import StatCard from '@/components/ui/StatCard'
import PageHeader from '@/components/ui/PageHeader'
import styles from './AdminDashboard.module.css'
import { differenceInDays, format } from 'date-fns'

export default function AdminDashboard() {
  const [stats, setStats]         = useState(null)
  const [overdueLoans, setOverdueLoans] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: totalBooks },
        { count: totalMembers },
        { count: activeLoans },
        { data: overdue },
        { data: pending },
        { count: pendingReservations },
      ] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('active_loans_view').select('*').lt('days_remaining', 0).order('days_remaining'),
        supabase.from('members').select('*').eq('status', 'pending').order('joined_at'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({ totalBooks, totalMembers, activeLoans, pendingReservations })
      setOverdueLoans(overdue || [])
      setPendingMembers(pending || [])
      setLoading(false)
    }
    load()
  }, [])

  async function approveMember(id) {
    await supabase.from('members').update({ status: 'active' }).eq('id', id)
    setPendingMembers(m => m.filter(x => x.id !== id))
  }

  if (loading) return <div className={styles.loading}>Loading dashboard…</div>

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Admin Overview" subtitle="Library at a glance." />

      <div className={`${styles.statsGrid} stagger`}>
        <StatCard label="Total books"        value={stats.totalBooks}           accent />
        <StatCard label="Total members"      value={stats.totalMembers}         />
        <StatCard label="Active loans"       value={stats.activeLoans}          />
        <StatCard label="Pending reservations" value={stats.pendingReservations} />
      </div>

      {/* Overdue */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            Overdue loans
            {overdueLoans.length > 0 && (
              <span className={styles.badge} style={{ background: 'rgba(184,92,56,0.1)', color: 'var(--rust)' }}>
                {overdueLoans.length}
              </span>
            )}
          </h2>
          <Link to="/admin/loans" className={styles.seeAll}>All loans →</Link>
        </div>
        {overdueLoans.length === 0 ? (
          <div className={styles.empty}>No overdue loans. 🎉</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Member</span><span>Book</span><span>Due date</span><span>Days overdue</span>
            </div>
            {overdueLoans.slice(0, 8).map(l => (
              <div key={l.id} className={styles.tableRow}>
                <span className={styles.cellPrimary}>{l.full_name}</span>
                <span className={styles.cellMuted}>{l.title}</span>
                <span className={styles.cellMuted}>{format(new Date(l.due_date), 'd MMM yyyy')}</span>
                <span className={styles.overduePill}>{Math.abs(l.days_remaining)}d</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending members */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            Pending approvals
            {pendingMembers.length > 0 && (
              <span className={styles.badge} style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold-dark)' }}>
                {pendingMembers.length}
              </span>
            )}
          </h2>
          <Link to="/admin/members" className={styles.seeAll}>All members →</Link>
        </div>
        {pendingMembers.length === 0 ? (
          <div className={styles.empty}>No pending approvals.</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Name</span><span>Email</span><span>Joined</span><span>Action</span>
            </div>
            {pendingMembers.map(m => (
              <div key={m.id} className={styles.tableRow}>
                <span className={styles.cellPrimary}>{m.full_name}</span>
                <span className={styles.cellMuted}>{m.email}</span>
                <span className={styles.cellMuted}>{format(new Date(m.joined_at), 'd MMM yyyy')}</span>
                <button className={styles.approveBtn} onClick={() => approveMember(m.id)}>
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
