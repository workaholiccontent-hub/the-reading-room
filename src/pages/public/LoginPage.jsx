import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const { signIn, member } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/member'

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await signIn({ email: email.trim(), password })
      // Give AuthContext a tick to load member profile
      setTimeout(() => navigate(from, { replace: true }), 100)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <Link to="/" className={styles.backLink}>← Back to library</Link>
          <h1 className={styles.cardTitle}>Welcome back</h1>
          <p className={styles.cardSub}>Sign in to your library account.</p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className={styles.switchLink}>
          Not a member yet? <Link to="/signup">Join for free</Link>
        </p>
      </div>
    </div>
  )
}
