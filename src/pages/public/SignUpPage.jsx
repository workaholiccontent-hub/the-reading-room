import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './AuthPage.module.css'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]     = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required'
    if (!form.email.trim())    e.email    = 'Email is required'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signUp({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim()
      })
      setDone(true)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.cardTitle}>You're in!</h1>
          <p className={styles.cardSub}>
            Check your email to confirm your address, then sign in to access your library.
          </p>
          <Link to="/login" style={{ marginTop: 24, display: 'block' }}>
            <Button variant="primary" fullWidth>Go to sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <Link to="/" className={styles.backLink}>← Back to library</Link>
          <h1 className={styles.cardTitle}>Join the Reading Room</h1>
          <p className={styles.cardSub}>Free membership, always.</p>
        </div>

        {errors.submit && (
          <div className={styles.errorBanner}>{errors.submit}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Full name"
            type="text"
            placeholder="Your full name"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            autoComplete="name"
          />
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Phone number (optional)"
            type="tel"
            placeholder="+1 234 567 8900"
            value={form.phone}
            onChange={set('phone')}
            autoComplete="tel"
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading}>
            Create my account
          </Button>
        </form>

        <p className={styles.switchLink}>
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
