import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { agents } from '../services/api'
import { CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Zap, DollarSign, Leaf, BarChart2 } from 'lucide-react'
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

function RiskBadge({ score }) {
  const s = Number(score) || 0
  const level = s <= 30 ? 'low' : s <= 60 ? 'medium' : 'high'
  const label = s <= 30 ? 'Low Risk' : s <= 60 ? 'Medium Risk' : 'High Risk'
  return <span className={`risk-badge risk-${level}`}>{label} ({s})</span>
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
  const [expanded, setExpanded]   = useState(false)
  const [toast, setToast]         = useState(false)

  const risk   = (match.risk_report && typeof match.risk_report === 'object') ? match.risk_report : {}
  const out    = (match.outreach    && typeof match.outreach    === 'object') ? match.outreach    : {}
  const corpR  = Number(risk.corporate_risk) || 0
  const startR = Number(risk.startup_risk)   || 0

  function handleApprove() {
    setToast(true)
    setTimeout(() => setToast(false), 3500)
  }

  return (
    <div className={`match-card rank-${rank + 1}`}>
      {toast && (
        <div className="toast">
          <CheckCircle size={18} /> Outreach approved! Email queued for review.
        </div>
      )}

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
        <div className="stat">
          <Leaf size={16} className="stat-icon co2" />
          <div>
            <span className="stat-label">CO₂ Reduction</span>
            <span className="stat-value">{match.co2_reduction_tons_year ?? '—'} t/yr</span>
          </div>
        </div>
        <div className="stat">
          <AlertTriangle size={16} className="stat-icon risk" />
          <div>
            <span className="stat-label">Corp / Startup Risk</span>
            <span className="stat-value">
              <RiskBadge score={corpR} /> / <RiskBadge score={startR} />
            </span>
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
        <Link
          to={`/intel/${match.building_id}?name=${encodeURIComponent(match.building_name || '')}&address=${encodeURIComponent(match.building_address || '')}`}
          className="btn-secondary btn-sm"
        >
          <BarChart2 size={15} /> Building Intel
        </Link>
        <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? <><ChevronUp size={15} /> Hide AI Content</> : <><ChevronDown size={15} /> View Email &amp; Lease</>}
        </button>
        <button className="btn-primary btn-sm" onClick={handleApprove}>
          <CheckCircle size={15} /> Approve &amp; Send
        </button>
      </div>

      {expanded && (
        <div className="outreach-section">
          <div className="outreach-block">
            <h4>📧 Generated Outreach Email</h4>
            <pre>{typeof out.email === 'string' ? out.email : 'No email generated.'}</pre>
          </div>
          <div className="outreach-block">
            <h4>📄 Lease Draft</h4>
            <pre>{typeof out.lease_draft === 'string' ? out.lease_draft : 'No lease draft generated.'}</pre>
          </div>
        </div>
      )}
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
