import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Ghost, AlertTriangle, CheckCircle, Mail, ChevronRight, Zap, Brain, Building2, Target, X } from 'lucide-react'
import L from 'leaflet'
import { dealScout as dealScoutApi } from '../services/api'
import 'leaflet/dist/leaflet.css'
import './FindNewHost.css'

const CENTER = [41.8819, -87.6278]
const ML_API = 'http://localhost:5000'
const CHICAGO_LICENSES_API = 'https://data.cityofchicago.org/resource/uupf-x98q.json'
const LOOP_BOUNDS = { latMin: 41.85, latMax: 41.91, lngMin: -87.66, lngMax: -87.60 }

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function createOccupancyIcon(occupancy, ghostScore) {
  let colorClass = 'occ-healthy'
  if (ghostScore >= 50) colorClass = 'occ-ghost'
  else if (ghostScore >= 25) colorClass = 'occ-risk'
  return new L.DivIcon({
    className: 'custom-div-marker',
    html: `<div class="occ-marker ${colorClass}"><span class="occ-label">${Math.round(occupancy)}%</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })
}

function FlyToBuilding({ building }) {
  const map = useMap()
  useEffect(() => {
    if (building?.Latitude && building?.Longitude) {
      map.flyTo([building.Latitude, building.Longitude], 17, { duration: 0.8 })
    }
  }, [building, map])
  return null
}

/* ── address helpers (copied from MapExplore) ── */
const normalizeAddress = (value) => {
  if (!value) return ''
  return String(value).toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(chicago|illinois|il|usa)\b/g, ' ')
    .replace(/\b\d{5}(?:-\d{4})?\b/g, ' ')
    .replace(/\b(north)\b/g, 'n').replace(/\b(south)\b/g, 's')
    .replace(/\b(east)\b/g, 'e').replace(/\b(west)\b/g, 'w')
    .replace(/\b(drive)\b/g, 'dr').replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave').replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(place)\b/g, 'pl').replace(/\s+/g, ' ').trim()
}
const addressKey = (value) => {
  const n = normalizeAddress(value)
  const ignored = new Set(['n','s','e','w','dr','st','ave','blvd','pl','rd','ct','ste','fl','rm'])
  return n.split(' ').filter(Boolean).filter(t => !ignored.has(t)).slice(0, 3).join(' ')
}
const looseAddressMatch = (a, b) => {
  const l = normalizeAddress(a), r = normalizeAddress(b)
  if (!l || !r) return false
  if (l.includes(r) || r.includes(l)) return true
  const lk = addressKey(l), rk = addressKey(r)
  if (lk && rk && (lk.includes(rk) || rk.includes(lk))) return true
  const lt = l.split(' ').filter(Boolean), rt = r.split(' ').filter(Boolean)
  return lt.filter(t => rt.includes(t)).length >= 2
}

async function fetchChicagoCompaniesDirect(building) {
  const raw = building?.Address || ''
  const seed = normalizeAddress(raw).split(' ').slice(0, 4).join(' ') || String(building?.['Property Name'] || '')
  const url = `${CHICAGO_LICENSES_API}?$limit=100&$q=${encodeURIComponent(seed)}`
  const rows = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })
  const companies = [], seen = new Set()
  for (const row of rows) {
    const name = row?.doing_business_as_name || row?.legal_name || row?.business_name
    const addr = row?.address || row?.street_address || row?.site_address
    if (!name || !addr || !looseAddressMatch(raw, addr)) continue
    const key = name.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    companies.push({ companyName: name, licenseStatus: row?.license_status || 'AAI', address: addr })
    if (companies.length >= 12) break
  }
  return companies
}

export default function FindNewHost() {
  const [buildings, setBuildings] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [companies, setCompanies] = useState({})
  const [companiesLoading, setCompaniesLoading] = useState({})
  const [proposalLoadingKey, setProposalLoadingKey] = useState('')
  const markerRefs = useRef({})

  const valid = useMemo(() =>
    buildings.filter(b =>
      b.Latitude >= LOOP_BOUNDS.latMin && b.Latitude <= LOOP_BOUNDS.latMax &&
      b.Longitude >= LOOP_BOUNDS.lngMin && b.Longitude <= LOOP_BOUNDS.lngMax
    ), [buildings])

  // load predictions
  useEffect(() => {
    Promise.all([
      fetch(`${ML_API}/api/ml/predictions`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${ML_API}/api/ml/stats`).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([pred, s]) => { setBuildings(pred.buildings || []); setStats(s) })
      .catch(() => setError('ML API unreachable — make sure api.py is running on port 5000.'))
  }, [])

  // load companies when building selected
  useEffect(() => {
    if (!selected) return
    const key = String(selected.ID)
    if (companies[key] || companiesLoading[key]) return
    setCompaniesLoading(p => ({ ...p, [key]: true }))
    ;(async () => {
      try {
        let result = await dealScoutApi.getLicenseCompanies({
          buildingName: selected['Property Name'],
          buildingAddress: selected.Address,
          latitude: selected.Latitude,
          longitude: selected.Longitude,
        })
        if (!Array.isArray(result) || result.length === 0) {
          result = await fetchChicagoCompaniesDirect(selected)
        }
        setCompanies(p => ({ ...p, [key]: result }))
      } catch {
        setCompanies(p => ({ ...p, [key]: [] }))
      } finally {
        setCompaniesLoading(p => ({ ...p, [key]: false }))
      }
    })()
  }, [selected])

  const handleProposal = async (building, company) => {
    const pk = `${building.ID}::${company.companyName}`
    setProposalLoadingKey(pk)
    try {
      const proposal = await dealScoutApi.generateCompanyProposal({
        buildingName: building['Property Name'],
        buildingAddress: building.Address,
        companyName: company.companyName,
      })
      const to = proposal?.to || `${company.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')}@mock-loopshare.com`
      const subject = proposal?.subject || `LoopShare proposal for ${company.companyName}`
      const body = proposal?.body || `Hi,\n\nI have a desk-sharing proposal for ${company.companyName} at ${building['Property Name']}.\n\nBest,\nLoopShare`
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } catch (err) { alert('AI proposal failed: ' + err.message) }
    finally { setProposalLoadingKey('') }
  }

  const getColor = (gs) => gs >= 50 ? '#ef4444' : gs >= 25 ? '#f59e0b' : '#22c55e'
  const getLabel = (gs) => gs >= 50 ? 'Ghost' : gs >= 25 ? 'At Risk' : 'Healthy'

  const ghostCount = valid.filter(b => b.ghost_score >= 50).length
  const riskCount = valid.filter(b => b.ghost_score >= 25 && b.ghost_score < 50).length

  return (
    <div className="fnh-page">
      {/* ─── Compact Guide Bar ─── */}
      <div className="fnh-guide">
        <div className="fnh-guide-inner container-wide">
          <div className="fnh-guide-left">
            <Zap size={18} className="fnh-guide-icon" />
            <h1>Find New Hosts</h1>
            {stats && (
              <div className="fnh-headline-stats">
                <span className="fnh-hstat"><strong>{valid.length}</strong> analyzed</span>
                <span className="fnh-hstat ghost"><strong>{ghostCount}</strong> ghost</span>
                <span className="fnh-hstat risk"><strong>{riskCount}</strong> at risk</span>
                <span className="fnh-hstat"><strong>{stats.avg_occupancy}%</strong> avg occ.</span>
              </div>
            )}
          </div>
          <div className="fnh-guide-steps">
            <div className="fnh-step"><span className="fnh-step-num">1</span> <Brain size={14} /> Explore AI map</div>
            <ChevronRight size={14} className="fnh-step-arrow" />
            <div className="fnh-step"><span className="fnh-step-num">2</span> <Building2 size={14} /> Find low-occupancy building</div>
            <ChevronRight size={14} className="fnh-step-arrow" />
            <div className="fnh-step"><span className="fnh-step-num">3</span> <Mail size={14} /> Send AI proposal</div>
          </div>
        </div>
      </div>

      {/* ─── Expandable how-it-works ─── */}
      <details className="fnh-details">
        <summary className="fnh-details-toggle">How does this work?</summary>
        <div className="fnh-details-body">
          <div className="fnh-detail-card">
            <h4><Brain size={15} /> 1. AI Occupancy Map</h4>
            <p>LoopShare predicts each building's occupancy rate using a <strong>Gradient Boosting ML model</strong> trained on the City of Chicago Energy Benchmarking public dataset. Low energy use = low occupancy.</p>
          </div>
          <div className="fnh-detail-card">
            <h4><Building2 size={15} /> 2. Spot Ghost Buildings</h4>
            <p>Red markers are <strong>ghost buildings</strong> (&lt;50% occupied). Click one to see vacancy details, energy data, and the companies registered at that address.</p>
          </div>
          <div className="fnh-detail-card">
            <h4><Mail size={15} /> 3. AI Email Proposals</h4>
            <p>For each company, click <strong>"Generate AI email proposal"</strong> to draft a personalized desk-sharing pitch and open it in your email client.</p>
          </div>
        </div>
      </details>

      {/* ─── Main Content ─── */}
      <div className="fnh-content">
        {/* Sidebar */}
        <aside className="fnh-sidebar">
          <div className="fnh-sidebar-header">
            <h2>Buildings</h2>
            <div className="fnh-stat-pills">
              <span className="fnh-pill ghost"><Ghost size={12} /> {ghostCount}</span>
              <span className="fnh-pill risk"><AlertTriangle size={12} /> {riskCount}</span>
              <span className="fnh-pill healthy"><CheckCircle size={12} /> {valid.length - ghostCount - riskCount}</span>
            </div>
          </div>
          <div className="fnh-sidebar-list">
            {error && <div className="fnh-error">{error}</div>}
            {valid.map(b => (
              <button
                key={b.ID}
                className={`fnh-sidebar-item ${selected?.ID === b.ID ? 'active' : ''}`}
                onClick={() => setSelected(b)}
              >
                <div className="fnh-badge" style={{ background: getColor(b.ghost_score) }}>
                  {Math.round(b.predicted_occupancy)}%
                </div>
                <div className="fnh-item-info">
                  <h4>{b['Property Name']}</h4>
                  <p>{b.Address}</p>
                  <span className="fnh-item-status" style={{ color: getColor(b.ghost_score) }}>
                    {getLabel(b.ghost_score)} &middot; {Math.round(b.vacancy_pct)}% vacant
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Map */}
        <div className="fnh-map-area">
          <MapContainer center={CENTER} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {selected && <FlyToBuilding building={selected} />}
            {valid.map(b => (
              <Marker
                key={b.ID}
                position={[b.Latitude, b.Longitude]}
                icon={createOccupancyIcon(b.predicted_occupancy, b.ghost_score)}
                ref={ref => { if (ref) markerRefs.current[b.ID] = ref }}
                eventHandlers={{ click: () => setSelected(b) }}
              />
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="fnh-legend">
            <h5>Occupancy Level</h5>
            <div className="fnh-legend-row"><span className="fnh-legend-dot" style={{ background: '#22c55e' }} /> Healthy (&gt;75%)</div>
            <div className="fnh-legend-row"><span className="fnh-legend-dot" style={{ background: '#f59e0b' }} /> At Risk (50–75%)</div>
            <div className="fnh-legend-row"><span className="fnh-legend-dot" style={{ background: '#ef4444' }} /> Ghost (&lt;50%)</div>
          </div>

          {/* ─── Detail Panel (right side overlay) ─── */}
          {selected && (
            <div className="fnh-detail-panel">
              <button className="fnh-detail-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>

              <div className="fnh-detail-scroll">
                {/* Header */}
                <div className="fnh-popup-head">
                  <div>
                    <h3>{selected['Property Name']}</h3>
                    <p className="fnh-popup-addr">{selected.Address}</p>
                  </div>
                  <span className="fnh-status-chip" style={{ background: getColor(selected.ghost_score) }}>
                    {getLabel(selected.ghost_score)}
                  </span>
                </div>

                {/* Occupancy bar */}
                <div className="fnh-occ-bar-wrap">
                  <div className="fnh-occ-bar-bg">
                    <div className="fnh-occ-bar-fill" style={{ width: `${selected.predicted_occupancy}%`, background: getColor(selected.ghost_score) }} />
                  </div>
                  <span className="fnh-occ-bar-lbl">{Math.round(selected.predicted_occupancy)}% occupied &middot; {Math.round(selected.vacancy_pct)}% vacant</span>
                </div>

                {/* Stats grid */}
                <div className="fnh-stats-grid">
                  <div><span>Ghost Score</span><strong>{Math.round(selected.ghost_score)}</strong></div>
                  <div><span>Type</span><strong>{selected['Primary Property Type'] || '—'}</strong></div>
                  <div><span>Sq Ft</span><strong>{selected['Gross Floor Area - Buildings (sq ft)']?.toLocaleString() || '—'}</strong></div>
                  <div><span>EUI</span><strong>{selected['Source EUI (kBtu/sq ft)']?.toFixed(0) || '—'}</strong></div>
                </div>

                {/* Companies section */}
                <div className="fnh-companies">
                  <h4><Target size={14} /> Companies at this address</h4>
                  {companiesLoading[String(selected.ID)] && <p className="fnh-loading">Looking up tenant companies…</p>}
                  {!companiesLoading[String(selected.ID)] && (companies[String(selected.ID)] || []).length === 0 && (
                    <p className="fnh-empty">No licensed companies found at this address.</p>
                  )}
                  {(companies[String(selected.ID)] || []).map(c => {
                    const pk = `${selected.ID}::${c.companyName}`
                    return (
                      <div key={pk} className="fnh-company-card">
                        <div className="fnh-company-top">
                          <div className="fnh-company-icon">
                            <Building2 size={14} />
                          </div>
                          <div className="fnh-company-info">
                            <strong>{c.companyName}</strong>
                            <span>{c.licenseStatus || 'Active'}</span>
                          </div>
                        </div>
                        <button
                          className="fnh-proposal-btn"
                          onClick={() => handleProposal(selected, c)}
                          disabled={proposalLoadingKey === pk}
                        >
                          <Mail size={14} />
                          {proposalLoadingKey === pk ? 'Generating…' : 'Generate AI email proposal'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
