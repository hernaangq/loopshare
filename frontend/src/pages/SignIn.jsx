import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Building2, Rocket, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function roleLabel(value) {
  return value === 'host' ? 'building owner' : 'space seeker'
}

export default function SignIn() {
  const { signUp, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    role: 'startup',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fallbackByRole = role === 'host' ? '/host' : '/startup'
  const redirectTo = location.state?.from ?? fallbackByRole

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const nextSession = await signUp(form)
      const roleDefault = nextSession.role === 'host' ? '/host' : '/startup'
      navigate(location.state?.from ?? roleDefault, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create account.')
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
        <h1>Sign up</h1>
        <p>Create your account with basic credentials.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-role-toggle">
            <button
              type="button"
              className={`login-role-pill ${form.role === 'startup' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, role: 'startup' })}
            >
              <Rocket size={16} /> Space Seeker
            </button>
            <button
              type="button"
              className={`login-role-pill ${form.role === 'host' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, role: 'host' })}
            >
              <Building2 size={16} /> Building Owner
            </button>
          </div>

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

          <div className="input-group">
            <label>Repeat password</label>
            <input
              type="password"
              className="input-field"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'} <ArrowRight size={18} />
          </button>

          <p className="login-helper-text">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  )
}
