import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { agents, dealScout as dealScoutApi } from '../services/api'
import { AlertTriangle, Zap, DollarSign, Mail } from 'lucide-react'
import './Results.css'

// Fix default Leaflet icon paths (Vite asset issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const RANK_COLORS  = ['#FF385C', '#FC642D', '#00A699']
const LOOP_CENTER  = [41.8827, -87.6327]

function makeIcon(rank) {
  const color = RANK_COLORS[rank] || '#666'
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${rank + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function ScoreRing({ score }) {
  const s = Number(score) || 0
  return (
    <div className="score-ring">
      <svg viewBox="0 0 36 36" className="score-svg">
        <path className="score-bg"  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path className="score-fill" strokeDasharray={`${s}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <span className="score-text">{s}</span>
    </div>
  )
}

function MatchCard({ match, rank }) {
  const [aiGenerating, setAiGenerating] = useState(false)

  const mockEmailFromName = (name) => {
    const normalized = (name || 'contact')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
    return `${normalized || 'contact'}@mock-loopshare.com`
  }

  const handleAiProposal = async () => {
    const buildingId = match?.building_id
    if (!buildingId) {
      alert('Building data not available for this result.')
      return
    }

    setAiGenerating(true)
    try {
      const run = await dealScoutApi.run({
        topN: 1,
        dryRun: false,
        benchmarks: [
          {
            buildingId,
            reportingYear: new Date().getFullYear(),
            source: 'ui-results-ai-proposal',
          },
        ],
      })

      const opportunity = (run.opportunities || []).find(o => o.buildingId === buildingId) || run.opportunities?.[0]
      if (!opportunity) {
        alert('AI agent did not return an outreach proposal for this building.')
        return
      }

      const buildingName = match?.building_name || 'your building'
      const fallbackContactName = opportunity.contact?.name || match?.host_company || buildingName
      const to = opportunity.contact?.email || mockEmailFromName(fallbackContactName)
      const subject = opportunity.emailSubject || `LoopShare proposal for ${buildingName}`
      const body = opportunity.emailBody || `Hi,\n\nI have a proposal for ${buildingName}.\n\nBest,\nLoopShare`

      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      if (run.runId && opportunity.buildingId) {
        dealScoutApi.updateStatus(run.runId, opportunity.buildingId, 'SENT').catch(() => {})
      }
    } catch (err) {
      alert('AI proposal failed: ' + err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className={`match-card rank-${rank + 1}`}>
      <div className="match-card-header">
        <div className="rank-badge" style={{ background: RANK_COLORS[rank] }}>#{rank + 1}</div>
        <div className="match-title">
          <h3>{match.building_name || 'Building'}</h3>
          <p className="match-address">{match.building_address} · {match.neighborhood}</p>
        </div>
        <ScoreRing score={match.match_score} />
      </div>

      <div className="match-stats">
        <div className="stat">
          <Zap size={16} className="stat-icon eui" />
          <div>
            <span className="stat-label">Site EUI</span>
            <span className="stat-value">{match.eui_score != null ? Number(match.eui_score).toFixed(1) : '—'} kBtu/sqft</span>
          </div>
        </div>
        <div className="stat">
          <DollarSign size={16} className="stat-icon cost" />
          <div>
            <span className="stat-label">Est. Monthly Cost</span>
            <span className="stat-value">${(Number(match.estimated_monthly_cost) || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {match.match_explanation && (
        <div className="match-explanation">{match.match_explanation}</div>
      )}

      <div className="match-meta">
        {match.host_company   && <span>🏢 {match.host_company}</span>}
        {match.days_available && <span>🗓️ {match.days_available.replace(/,/g, ', ')}</span>}
        {match.desks_available != null && (
          <span>💺 {match.desks_available} desks · ${match.price_per_desk_per_day}/desk/day</span>
        )}
        {match.floor_number   && <span>📐 Floor {match.floor_number}</span>}
      </div>

      <div className="match-actions">
        <button className="btn-primary btn-sm" onClick={handleAiProposal} disabled={aiGenerating}>
          <Mail size={15} /> {aiGenerating ? 'Generating AI draft...' : 'Generate AI email proposal'}
        </button>
      </div>
    </div>
  )
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()

  // Initialize result directly from navigation state — no blank first render
  const [result,  setResult]  = useState(() => location.state?.result  || null)
  const [profile, setProfile] = useState(() => location.state?.profile || null)
  const [loading, setLoading] = useState(!location.state?.result)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    // Only fetch demo data when there's no result from navigation
    if (!location.state?.result) {
      agents.demo()
        .then(r => { setResult(r); setProfile(r.startup) })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="results-loading">
      <div className="spin-large">⟳</div>
      <p>Loading demo results…</p>
    </div>
  )

  if (error) return (
    <div className="results-error">
      <AlertTriangle size={40} />
      <h2>Something went wrong</h2>
      <p>{error}</p>
      <button className="btn-primary" onClick={() => navigate('/onboarding')}>Try Again</button>
    </div>
  )

  if (!result) return null

  const matches = Array.isArray(result.matches) ? result.matches : []

  // Map markers with fallback coordinates (Chicago Loop)
  const markers = matches.map((m, i) => ({
    lat:  (m.latitude  && m.latitude  !== 0) ? m.latitude  : (41.882 + (i - 1) * 0.003),
    lng:  (m.longitude && m.longitude !== 0) ? m.longitude : (-87.632 + (i - 1) * 0.003),
    name: m.building_name || `Match #${i + 1}`,
    rank: i,
  }))

  return (
    <div className="results-page">
      <div className="results-header">
        <div>
          <h1>Your Top Matches</h1>
          <p>{matches.length} office space{matches.length !== 1 ? 's' : ''} found for <strong>{profile?.company || 'your team'}</strong> in the Loop</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/onboarding')}>← New Search</button>
      </div>

      {/* Map */}
      <div className="results-map-wrap">
        <MapContainer center={LOOP_CENTER} zoom={15} className="results-map" scrollWheelZoom={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          {markers.map((m, i) => (
            <Marker key={i} position={[m.lat, m.lng]} icon={makeIcon(m.rank)}>
              <Popup>
                <strong>#{m.rank + 1} {m.name}</strong>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="map-legend">
          {RANK_COLORS.map((c, i) => (
            <span key={i} className="legend-item">
              <span className="legend-dot" style={{ background: c }} />
              #{i + 1} Match
            </span>
          ))}
        </div>
      </div>

      {/* Match Cards */}
      <div className="matches-list">
        {matches.map((match, i) => (
          <MatchCard key={i} match={match} rank={i} profile={profile} />
        ))}
        {matches.length === 0 && (
          <div className="no-matches">
            <p>No matches found. Try adjusting your days, budget, or zone.</p>
            <button className="btn-primary" onClick={() => navigate('/onboarding')}>Edit Search</button>
          </div>
        )}
      </div>
    </div>
  )
}
