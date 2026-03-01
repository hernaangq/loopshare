import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { agents } from '../services/api'
import { Building2, Users, DollarSign, Briefcase, Loader2 } from 'lucide-react'
import './Onboarding.css'

const AGENT_LABELS = [
  'Scanning Loop buildings...',
  'Analyzing energy data...',
  'Calculating risk scores...',
  'Finding your matches...',
]

function AgentLoader() {
  const [idx, setIdx]       = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const cycle = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % AGENT_LABELS.length)
        setFading(false)
      }, 400)
    }, 2000)
    return () => clearInterval(cycle)
  }, [])

  return (
    <div className="agent-fullscreen">
      <div className="loader-center">
        <div className="loader-orbit">
          <div className="loader-dot" />
          <div className="loader-dot" />
          <div className="loader-dot" />
        </div>
        <p className="loader-label" style={{ opacity: fading ? 0 : 1 }}>
          {AGENT_LABELS[idx]}
        </p>
      </div>
      <div className="loader-bar-track">
        <div className="loader-bar-fill" />
      </div>
    </div>
  )
}

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const SECTORS = ['Software', 'Fintech', 'Healthcare', 'Marketing', 'Legal', 'Design', 'Consulting', 'Other']

export default function Onboarding() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    company: '',
    sector:  'Software',
    days:    ['Monday', 'Wednesday'],
    people:  8,
    budget:  2000,
  })
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState(null)
  const [step,    setStep]      = useState(1)   // 1 = form, 2 = loading

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.company.trim()) { setError('Please enter your company name.'); return }
    if (form.days.length === 0) { setError('Select at least one day.'); return }

    setError(null)
    setLoading(true)
    setStep(2)

    try {
      const result = await agents.orchestrate(form)
      navigate('/results', { state: { result, profile: form } })
    } catch (err) {
      setError('Something went wrong: ' + err.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  if (step === 2) return <AgentLoader />

  return (
    <div className="onboarding-page">
      <div className="onboarding-hero">
        <Building2 size={40} className="onboarding-icon" />
        <h1>Find Your Loop Office</h1>
        <p>Tell us about your team and we'll match you with the best available desk space in Chicago's Loop — powered by AI.</p>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit}>

        {/* Company */}
        <div className="field-group">
          <label><Briefcase size={16} /> Company Name</label>
          <input
            type="text"
            placeholder="e.g. TechStart Chicago"
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            required
          />
        </div>

        {/* Sector */}
        <div className="field-group">
          <label><Briefcase size={16} /> Sector</label>
          <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Days */}
        <div className="field-group">
          <label>Days Needed</label>
          <div className="day-toggle-group">
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                className={`day-toggle ${form.days.includes(day) ? 'active' : ''}`}
                onClick={() => toggleDay(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <span className="field-hint">{form.days.length} day{form.days.length !== 1 ? 's' : ''} selected</span>
        </div>

        {/* People */}
        <div className="field-group">
          <label><Users size={16} /> Number of People</label>
          <div className="slider-row">
            <input
              type="range" min={1} max={50} step={1}
              value={form.people}
              onChange={e => setForm(f => ({ ...f, people: +e.target.value }))}
            />
            <span className="slider-value">{form.people}</span>
          </div>
        </div>

        {/* Budget */}
        <div className="field-group">
          <label><DollarSign size={16} /> Max Monthly Budget</label>
          <div className="slider-row">
            <input
              type="range" min={500} max={10000} step={100}
              value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: +e.target.value }))}
            />
            <span className="slider-value">${form.budget.toLocaleString()}</span>
          </div>
        </div>

{error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary btn-lg submit-btn" disabled={loading}>
          {loading ? <><Loader2 size={18} className="spin" /> Finding matches...</> : 'Find My Office Space →'}
        </button>

        <p className="form-disclaimer">
          Our AI analyzes real Chicago building energy data, violations records, and your requirements to find the best matches.
        </p>
      </form>
    </div>
  )
}
