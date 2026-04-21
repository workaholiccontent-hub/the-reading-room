import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import styles from './MemberProfilePage.module.css'

export default function MemberProfilePage() {
  const { member, refreshMember } = useAuth()
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({
    full_name: member?.full_name || '',
    phone:     member?.phone || '',
  })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('members')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null })
      .eq('id', member.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile updated!')
      await refreshMember()
      setEditing(false)
    }
    setSaving(false)
  }

  const statusColor = {
    active:    'var(--sage)',
    pending:   'var(--gold-dark)',
    suspended: 'var(--rust)',
    expired:   'var(--ink-muted)',
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="My Profile" subtitle="Your membership information." />

      <div className={styles.grid}>
        {/* Profile card */}
        <div className={styles.card}>
          <div className={styles.avatar}>
            {member?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className={styles.memberInfo}>
            <h2 className={styles.name}>{member?.full_name}</h2>
            <p className={styles.number}>{member?.membership_number}</p>
            <span
              className={styles.statusBadge}
              style={{ color: statusColor[member?.status] }}
            >
              {member?.status}
            </span>
          </div>

          {!editing ? (
            <div className={styles.details}>
              <Row label="Email"   value={member?.email} />
              <Row label="Phone"   value={member?.phone || '—'} />
              <Row label="Member since" value={member?.joined_at
                ? new Date(member.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
              />
              <Row label="Role" value={member?.role} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setForm({ full_name: member.full_name, phone: member.phone || '' })
                  setEditing(true)
                }}
                style={{ marginTop: 16 }}
              >
                Edit profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSave} className={styles.editForm}>
              <Input
                label="Full name"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Membership notice */}
        {member?.status === 'pending' && (
          <div className={styles.pendingCard}>
            <h3>Membership pending</h3>
            <p>
              Your account is under review. Once approved by an admin,
              you'll be able to borrow books and access all member features.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}
