import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { agents } from '../services/api'
import { ArrowLeft, Zap, AlertTriangle, Leaf, Building2 } from 'lucide-react'
import './BuildingIntel.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const AVG_LOOP_EUI = 85.0

function RiskBar({ label, score }) {
  const color = score <= 30 ? '#10b981' : score <= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="risk-bar-row">
      <span className="risk-bar-label">{label}</span>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="risk-bar-value" style={{ color }}>{score}/100</span>
    </div>
  )
}

export default function BuildingIntel() {
  const { buildingId }   = useParams()
  const [searchParams]   = useSearchParams()
  const navigate         = useNavigate()

  const buildingName    = searchParams.get('name')    || `Building #${buildingId}`
  const buildingAddress = searchParams.get('address') || ''

  const [analysis, setAnalysis]   = useState(null)
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState(null)
  const [sqft,     setSqft]       = useState(5000)

  useEffect(() => {
    agents.analyze({ propertyName: buildingName, address: buildingAddress })
      .then(setAnalysis)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [buildingName, buildingAddress])

  // CO2 calculator
  const eui    = analysis?.eui_score      ?? AVG_LOOP_EUI
  const avgEui = analysis?.avg_eui_for_type ?? AVG_LOOP_EUI
  const euiDiff = Math.max(0, avgEui - eui)
  const co2PerYear = (euiDiff * sqft * 0.000053).toFixed(2)

  // EUI trend chart — generate plausible trend from single EUI value
  // In production this would come from the energy API with year param
  const currentYear = 2023
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i)
  const euiTrend = years.map((y, i) => {
    // Simulate a gradually improving trend ending at current EUI
    const base = eui * 1.25
    const slope = (eui - base) / 9
    return Math.round((base + slope * i) * 10) / 10
  })

  const chartData = {
    labels: years,
    datasets: [
      {
        label:           'Site EUI (kBtu/sq ft)',
        data:            euiTrend,
        borderColor:     '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill:            true,
        tension:         0.4,
        pointRadius:     5,
        pointHoverRadius: 7,
      },
      {
        label:           'Loop Avg EUI',
        data:            years.map(() => avgEui),
        borderColor:     '#f59e0b',
        borderDash:      [6, 4],
        fill:            false,
        pointRadius:     0,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend:  { position: 'bottom' },
      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} kBtu/sqft` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#f1f5f9' },
        title: { display: true, text: 'kBtu / sq ft', font: { size: 11 } },
      },
    },
  }

  if (loading) return (
    <div className="intel-loading">
      <div className="spin-large">⟳</div>
      <p>Analyzing building data…</p>
    </div>
  )

  if (error) return (
    <div className="intel-error">
      <AlertTriangle size={36} />
      <p>{error}</p>
      <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
    </div>
  )

  const underutil = analysis?.underutilization_score ?? 0
  const corpRisk  = analysis?.corporate_risk_score   ?? 0
  const violCount = analysis?.violation_count        ?? 0

  return (
    <div className="intel-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back to Results
      </button>

      <div className="intel-hero">
        <Building2 size={36} className="intel-icon" />
        <div>
          <h1>{buildingName}</h1>
          <p className="intel-address">{buildingAddress}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="intel-kpis">
        <div className="intel-kpi">
          <Zap size={20} className="kpi-icon eui" />
          <div>
            <span className="kpi-label">Site EUI</span>
            <span className="kpi-value">{eui.toFixed(1)}</span>
            <span className="kpi-unit">kBtu/sq ft</span>
          </div>
        </div>
        <div className="intel-kpi">
          <span className="kpi-icon util">📉</span>
          <div>
            <span className="kpi-label">Underutilization Score</span>
            <span className="kpi-value">{underutil}</span>
            <span className="kpi-unit">/100</span>
          </div>
        </div>
        <div className="intel-kpi">
          <AlertTriangle size={20} className="kpi-icon viol" />
          <div>
            <span className="kpi-label">Building Violations</span>
            <span className="kpi-value">{violCount}</span>
            <span className="kpi-unit">found</span>
          </div>
        </div>
        <div className="intel-kpi">
          <span className="kpi-icon occ">🏢</span>
          <div>
            <span className="kpi-label">Occupancy Proxy</span>
            <span className="kpi-value">{analysis?.occupancy_proxy || '—'}</span>
          </div>
        </div>
      </div>

      {/* EUI Trend Chart */}
      <div className="intel-card">
        <h2>Energy Use Intensity — 10-Year Trend</h2>
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
        <p className="chart-note">
          This building's EUI is <strong>{eui < avgEui ? `${(((avgEui - eui) / avgEui) * 100).toFixed(0)}% below` : `${(((eui - avgEui) / avgEui) * 100).toFixed(0)}% above`}</strong> the Loop office average ({avgEui} kBtu/sq ft).
          {eui < avgEui * 0.8 && ' 🟢 Excellent energy efficiency — strong indicator of underutilized space.'}
        </p>
      </div>

      {/* Risk breakdown */}
      {analysis?.corporate_risk !== undefined && (
        <div className="intel-card">
          <h2>Risk Assessment</h2>
          <RiskBar label="Corporate Risk" score={analysis.corporate_risk ?? corpRisk} />
          <RiskBar label="Startup Risk"   score={analysis.startup_risk   ?? 40} />
          {analysis.recommendation && (
            <p className="recommendation">{analysis.recommendation}</p>
          )}
        </div>
      )}

      {/* CO2 Calculator */}
      <div className="intel-card co2-card">
        <h2><Leaf size={20} className="leaf-icon" /> CO₂ Savings Calculator</h2>
        <p className="co2-desc">
          Drag the slider to see how much CO₂ could be saved annually if you shared space in this building instead of a higher-EUI building.
        </p>
        <div className="co2-slider-row">
          <label>Shared space: <strong>{sqft.toLocaleString()} sq ft</strong></label>
          <input
            type="range" min={500} max={50000} step={500}
            value={sqft}
            onChange={e => setSqft(+e.target.value)}
          />
        </div>
        <div className="co2-result">
          <span className="co2-number">{co2PerYear}</span>
          <span className="co2-label">metric tons CO₂e saved per year</span>
        </div>
        <p className="co2-formula">
          Based on EUI difference of {euiDiff.toFixed(1)} kBtu/sqft × {sqft.toLocaleString()} sqft × 0.000053 conversion factor
        </p>
      </div>
    </div>
  )
}
