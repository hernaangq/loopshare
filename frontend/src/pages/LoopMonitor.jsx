import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildings, listings } from '../services/api'
import { Activity, Building2, Zap, Users } from 'lucide-react'
import './LoopMonitor.css'

export default function LoopMonitor() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [buildingList, listingList] = await Promise.all([
          buildings.getAll(),
          listings.getActive(),
        ])
        setData({ buildings: buildingList, listings: listingList })
      } catch (err) {
        setError(err.message || 'Failed to load market data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="monitor-loading">Loading Loop market data…</div>
  if (error)   return <div className="monitor-error">{error}</div>

  const { buildings: bList, listings: lList } = data
  const totalDesks = lList.reduce((sum, l) => sum + (l.availableDesks || 0), 0)
  const avgEui = bList.length
    ? (bList.reduce((sum, b) => sum + (b.siteEui || 0), 0) / bList.length).toFixed(1)
    : '—'

  return (
    <div className="monitor-page">
      <div className="monitor-hero">
        <Activity size={36} className="monitor-icon" />
        <div>
          <h1>Loop Monitor</h1>
          <p>Real-time market health for Chicago's Loop shared workspace ecosystem</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="monitor-stats">
        <div className="monitor-stat-card">
          <div className="stat-value">{bList.length}</div>
          <div className="stat-label">Buildings</div>
        </div>
        <div className="monitor-stat-card">
          <div className="stat-value">{lList.length}</div>
          <div className="stat-label">Active Listings</div>
        </div>
        <div className="monitor-stat-card">
          <div className="stat-value">{totalDesks}</div>
          <div className="stat-label">Desks Available</div>
        </div>
        <div className="monitor-stat-card">
          <div className="stat-value">{avgEui}</div>
          <div className="stat-label">Avg Site EUI</div>
        </div>
      </div>

      {/* Building list */}
      <h2 className="monitor-section-title">Buildings</h2>
      <div className="monitor-buildings">
        {bList.map((b) => {
          const euiClass = !b.siteEui ? '' : b.siteEui <= 70 ? 'eui-good' : b.siteEui <= 100 ? 'eui-warn' : 'eui-bad'
          const bListings = lList.filter((l) => l.buildingId === b.id)
          return (
            <div
              key={b.id}
              className="monitor-building-row"
              onClick={() => navigate(`/intel/${b.id}`)}
            >
              <div className="building-row-left">
                <Building2 size={22} className="row-icon" />
                <div>
                  <div className="building-row-name">{b.name}</div>
                  <div className="building-row-addr">{b.address}</div>
                </div>
              </div>
              <div className="building-row-right">
                <div className="row-metric">
                  <div className={`metric-val ${euiClass}`}>
                    <Zap size={14} style={{ verticalAlign: '-2px' }} /> {b.siteEui ?? '—'}
                  </div>
                  <div className="metric-label">Site EUI</div>
                </div>
                <div className="row-metric">
                  <div className="metric-val">
                    <Users size={14} style={{ verticalAlign: '-2px' }} /> {bListings.length}
                  </div>
                  <div className="metric-label">Listings</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
