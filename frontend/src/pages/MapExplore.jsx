import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Users, DollarSign, Building2, Activity, Ghost, AlertTriangle, CheckCircle } from 'lucide-react'
import L from 'leaflet'
import { buildings as buildingsApi, listings as listingsApi } from '../services/api'
import DayChips from '../components/DayChips'
import 'leaflet/dist/leaflet.css'
import './MapExplore.css'

// Chicago Loop center
const CENTER = [41.8819, -87.6278]

// ML API base URL — Flask runs on port 5000 with CORS enabled
const ML_API = 'http://localhost:5000'

// Bounding box for the Chicago Loop / Near West / South Loop
const LOOP_BOUNDS = { latMin: 41.85, latMax: 41.91, lngMin: -87.66, lngMax: -87.60 }

// Fix default Leaflet marker icon paths (Vite/Webpack issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom marker icons using DivIcon — Listings mode
function createMarkerIcon(hasListings) {
  return new L.DivIcon({
    className: 'custom-div-marker',
    html: `<div class="marker-pin ${hasListings ? 'marker-active' : 'marker-inactive'}">
             <div class="marker-inner"></div>
           </div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
  })
}

// Occupancy marker — color-coded circle with percentage label
function createOccupancyIcon(occupancy, ghostScore) {
  let colorClass = 'occ-healthy'
  if (ghostScore >= 50) colorClass = 'occ-ghost'
  else if (ghostScore >= 25) colorClass = 'occ-risk'

  const pct = Math.round(occupancy)
  return new L.DivIcon({
    className: 'custom-div-marker',
    html: `<div class="occ-marker ${colorClass}">
             <span class="occ-label">${pct}%</span>
           </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })
}

// Component to fly to a building when selected
function FlyToBuilding({ building, latKey = 'latitude', lngKey = 'longitude' }) {
  const map = useMap()
  useEffect(() => {
    const lat = building?.[latKey]
    const lng = building?.[lngKey]
    if (lat && lng) {
      map.flyTo([lat, lng], 17, { duration: 0.8 })
    }
  }, [building, map, latKey, lngKey])
  return null
}

export default function MapExplore() {
  const [mode, setMode] = useState('listings') // 'listings' | 'occupancy'

  // Listings mode state
  const [buildingsList, setBuildingsList] = useState([])
  const [listingsByBuilding, setListingsByBuilding] = useState({})
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const markerRefs = useRef({})

  // Occupancy mode state
  const [mlBuildings, setMlBuildings] = useState([])
  const [mlStats, setMlStats] = useState(null)
  const [mlError, setMlError] = useState(null)
  const [selectedMlBuilding, setSelectedMlBuilding] = useState(null)
  const mlMarkerRefs = useRef({})

  const validMlBuildings = useMemo(() =>
    mlBuildings.filter(b =>
      b.Latitude >= LOOP_BOUNDS.latMin && b.Latitude <= LOOP_BOUNDS.latMax &&
      b.Longitude >= LOOP_BOUNDS.lngMin && b.Longitude <= LOOP_BOUNDS.lngMax
    ),
    [mlBuildings]
  )

  // Fetch listings data
  useEffect(() => {
    buildingsApi.getAll().then(setBuildingsList)
    listingsApi.getActive().then(data => {
      const grouped = {}
      data.forEach(l => {
        const bid = l.building?.id
        if (bid) {
          if (!grouped[bid]) grouped[bid] = []
          grouped[bid].push(l)
        }
      })
      setListingsByBuilding(grouped)
    })
  }, [])

  // Fetch ML data when switching to occupancy mode
  useEffect(() => {
    if (mode !== 'occupancy' || mlBuildings.length > 0) return
    setMlError(null)
    Promise.all([
      fetch(`${ML_API}/api/ml/predictions`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch(`${ML_API}/api/ml/stats`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
    ])
      .then(([pred, stats]) => {
        console.log('ML API response:', { pred, stats })
        setMlBuildings(pred.buildings || [])
        setMlStats(stats)
      })
      .catch(() => setMlError('Could not connect to ML API on port 5000. Is api.py running?'))
  }, [mode, mlBuildings.length])

  const handleSidebarClick = (b) => {
    setSelectedBuilding(b)
    setTimeout(() => {
      const marker = markerRefs.current[b.id]
      if (marker) marker.openPopup()
    }, 900)
  }

  const handleMlSidebarClick = (b) => {
    setSelectedMlBuilding(b)
    setTimeout(() => {
      const marker = mlMarkerRefs.current[b.ID]
      if (marker) marker.openPopup()
    }, 900)
  }

  const getStatusLabel = (ghostScore) => {
    if (ghostScore >= 50) return 'Ghost'
    if (ghostScore >= 25) return 'At Risk'
    return 'Healthy'
  }

  const getStatusColor = (ghostScore) => {
    if (ghostScore >= 50) return '#ef4444'
    if (ghostScore >= 25) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <div className="map-page">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="map-sidebar-header">
          {/* Mode toggle */}
          <div className="map-mode-toggle">
            <button
              className={`mode-btn ${mode === 'listings' ? 'active' : ''}`}
              onClick={() => setMode('listings')}
            >
              <Building2 size={16} /> Listings
            </button>
            <button
              className={`mode-btn mode-btn-ai ${mode === 'occupancy' ? 'active' : ''}`}
              onClick={() => setMode('occupancy')}
            >
              <Activity size={16} /> AI Occupancy
            </button>
          </div>

          {mode === 'listings' ? (
            <>
              <h2>Buildings in the Loop</h2>
              <p className="text-sm text-muted">{buildingsList.length} locations</p>
            </>
          ) : (
            <>
              <h2>Occupancy Predictions</h2>
              <p className="text-sm text-muted">
                {validMlBuildings.length} buildings analyzed by ML
              </p>
              {mlStats && (
                <div className="ml-stats-bar">
                  <span className="ml-stat ghost"><Ghost size={13} /> {mlStats.ghost_buildings} ghost</span>
                  <span className="ml-stat risk"><AlertTriangle size={13} /> {mlStats.at_risk_buildings} at risk</span>
                  <span className="ml-stat healthy"><CheckCircle size={13} /> {mlStats.healthy_buildings} healthy</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar list — Listings mode */}
        {mode === 'listings' && (
          <div className="map-sidebar-list">
            {buildingsList.map(b => {
              const bListings = listingsByBuilding[b.id] || []
              const totalDesks = bListings.reduce((s, l) => s + l.desksAvailable, 0)
              const minPrice = bListings.length ? Math.min(...bListings.map(l => l.pricePerDeskPerDay)) : 0
              return (
                <button
                  key={b.id}
                  className={`map-sidebar-item ${selectedBuilding?.id === b.id ? 'active' : ''}`}
                  onClick={() => handleSidebarClick(b)}
                >
                  <img src={b.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200'} alt={b.name} className="sidebar-item-img" />
                  <div className="sidebar-item-info">
                    <h4>{b.name}</h4>
                    <p className="text-xs text-muted">{b.neighborhood}</p>
                    <div className="sidebar-item-stats">
                      <span><Users size={12} /> {totalDesks} desks</span>
                      {minPrice > 0 && <span><DollarSign size={12} /> from ${minPrice}/day</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Sidebar list — Occupancy mode */}
        {mode === 'occupancy' && (
          <div className="map-sidebar-list">
            {mlError && <div className="ml-error">{mlError}</div>}
            {validMlBuildings.map(b => (
              <button
                key={b.ID}
                className={`map-sidebar-item ${selectedMlBuilding?.ID === b.ID ? 'active' : ''}`}
                onClick={() => handleMlSidebarClick(b)}
              >
                <div className="occ-sidebar-badge" style={{ background: getStatusColor(b.ghost_score) }}>
                  {Math.round(b.predicted_occupancy)}%
                </div>
                <div className="sidebar-item-info">
                  <h4>{b['Property Name']}</h4>
                  <p className="text-xs text-muted">{b.Address}</p>
                  <div className="sidebar-item-stats">
                    <span style={{ color: getStatusColor(b.ghost_score), fontWeight: 600 }}>
                      {getStatusLabel(b.ghost_score)}
                    </span>
                    <span>Vacancy: {Math.round(b.vacancy_pct)}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={CENTER}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          {mode === 'occupancy' ? (
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* Listings markers */}
          {mode === 'listings' && (
            <>
              {selectedBuilding && <FlyToBuilding building={selectedBuilding} />}
              {buildingsList.map(b => {
                if (!b.latitude || !b.longitude) return null
                const bListings = listingsByBuilding[b.id] || []
                return (
                  <Marker
                    key={b.id}
                    position={[b.latitude, b.longitude]}
                    icon={createMarkerIcon(bListings.length > 0)}
                    ref={(ref) => { if (ref) markerRefs.current[b.id] = ref }}
                    eventHandlers={{ click: () => setSelectedBuilding(b) }}
                  >
                    <Popup maxWidth={300} className="custom-popup">
                      <div className="map-info-window">
                        <h4>{b.name}</h4>
                        <p className="popup-address">{b.address}</p>
                        {bListings.length > 0 ? (
                          bListings.map(l => (
                            <Link key={l.id} to={`/listings/${l.id}`} className="map-info-listing">
                              <span className="map-info-listing-text">
                                {l.desksAvailable} desks &middot; ${l.pricePerDeskPerDay}/day
                              </span>
                              <DayChips days={l.daysAvailable} compact />
                            </Link>
                          ))
                        ) : (
                          <p className="popup-empty">No active listings in this building.</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </>
          )}

          {/* Occupancy markers */}
          {mode === 'occupancy' && (
            <>
              {selectedMlBuilding && (
                <FlyToBuilding building={selectedMlBuilding} latKey="Latitude" lngKey="Longitude" />
              )}
              {validMlBuildings.map(b => {
                if (!b.Latitude || !b.Longitude) return null
                return (
                  <Marker
                    key={b.ID}
                    position={[b.Latitude, b.Longitude]}
                    icon={createOccupancyIcon(b.predicted_occupancy, b.ghost_score)}
                    ref={(ref) => { if (ref) mlMarkerRefs.current[b.ID] = ref }}
                    eventHandlers={{ click: () => setSelectedMlBuilding(b) }}
                  >
                    <Popup maxWidth={320} className="custom-popup occ-popup">
                      <div className="map-info-window">
                        <div className="occ-popup-header">
                          <h4>{b['Property Name']}</h4>
                          <span
                            className="occ-status-badge"
                            style={{ background: getStatusColor(b.ghost_score) }}
                          >
                            {getStatusLabel(b.ghost_score)}
                          </span>
                        </div>
                        <p className="popup-address">{b.Address}</p>

                        <div className="occ-bar-wrapper">
                          <div className="occ-bar-bg">
                            <div
                              className="occ-bar-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, b.predicted_occupancy))}%`,
                                background: getStatusColor(b.ghost_score),
                              }}
                            />
                          </div>
                          <span className="occ-bar-label">{Math.round(b.predicted_occupancy)}% occupied</span>
                        </div>

                        <div className="occ-popup-details">
                          <div className="occ-detail-row">
                            <span>Vacancy</span>
                            <strong>{Math.round(b.vacancy_pct)}%</strong>
                          </div>
                          <div className="occ-detail-row">
                            <span>Ghost Score</span>
                            <strong>{Math.round(b.ghost_score)}</strong>
                          </div>
                          <div className="occ-detail-row">
                            <span>Type</span>
                            <strong>{b['Primary Property Type'] || '—'}</strong>
                          </div>
                          <div className="occ-detail-row">
                            <span>Sq Ft</span>
                            <strong>{b['Gross Floor Area - Buildings (sq ft)']?.toLocaleString() || '—'}</strong>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </>
          )}
        </MapContainer>

        {/* Occupancy legend overlay */}
        {mode === 'occupancy' && (
          <div className="occ-legend">
            <h5>Occupancy Level</h5>
            <div className="occ-legend-row">
              <span className="occ-legend-dot" style={{ background: '#22c55e' }} />
              <span>Healthy (&gt;75%)</span>
            </div>
            <div className="occ-legend-row">
              <span className="occ-legend-dot" style={{ background: '#f59e0b' }} />
              <span>At Risk (50–75%)</span>
            </div>
            <div className="occ-legend-row">
              <span className="occ-legend-dot" style={{ background: '#ef4444' }} />
              <span>Ghost (&lt;50%)</span>
            </div>
            {mlStats && (
              <div className="occ-legend-summary">
                Avg occupancy: <strong>{mlStats.avg_occupancy}%</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
