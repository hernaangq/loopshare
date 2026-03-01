import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function roleLabel(value) {
  return value === 'host' ? 'building owner' : 'space seeker'
}

function resolveRedirectForRole(fromPath, currentRole) {
  if (!fromPath) return currentRole === 'host' ? '/host' : '/startup'

  if (currentRole === 'host' && fromPath.startsWith('/startup')) return '/host'
  if (currentRole === 'startup' && fromPath.startsWith('/host')) return '/startup'

  return fromPath
}

export default function Login() {
  const { login, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const safeRole = role === 'host' ? 'host' : 'startup'
  const redirectTo = resolveRedirectForRole(location.state?.from, safeRole)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const nextSession = await login({ username: form.username, password: form.password })
      const nextRole = nextSession.role === 'host' ? 'host' : 'startup'
      const target = resolveRedirectForRole(location.state?.from, nextRole)
      navigate(target, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthenticated) {
    return (
      <section className="login-page">
        <div className="login-card">
          <h1>Session already active</h1>
          <p>You are already signed in as <strong>{roleLabel(role)}</strong>.</p>
          <Link to={redirectTo} className="btn btn-primary">Continue <ArrowRight size={16} /></Link>
        </div>
      </section>
    )
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <h1>Log in</h1>
        <p>Enter your username and password.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              className="input-field"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'} <ArrowRight size={18} />
          </button>

          <div className="login-helper-links">
            <p className="login-helper-text">
              Don&apos;t have an account? <Link to="/signin">Sign up</Link>
            </p>
            <p className="login-helper-text">
              <Link to="/">Continue as a guest</Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
