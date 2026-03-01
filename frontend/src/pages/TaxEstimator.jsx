import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, Building2, TrendingUp, Shield, DollarSign,
  Info, ArrowRight, CheckCircle, AlertTriangle, HelpCircle,
  Users, FileText, Landmark, BadgeDollarSign,
} from 'lucide-react'
import './TaxEstimator.css'

// ─── Constants (2026 Illinois / Chicago) ───
const IL_CORPORATE_TAX_RATE = 0.095        // 9.5% combined (income + replacement)
const EZ_DEDUCTION_MULTIPLIER = 2           // Double deduction under 35 ILCS 5/203
const HEAD_TAX_PER_EMPLOYEE = 21            // $21/month Community Safety Surcharge (2026)
const FMV_PER_SQFT_YEAR = 50                // Fair Market Value estimate $/sqft/yr (Loop avg)
const SQFT_PER_DESK = 75                    // ~75 sqft per desk (industry standard)
const WORKING_DAYS_PER_YEAR = 260           // Mon-Fri × 52

export default function TaxEstimator() {
  // ─── Calculator State ───
  const [form, setForm] = useState({
    desks: 10,
    daysPerWeek: 3,
    pricePerDesk: 35,
    employeeCount: 500,
    weeksPerYear: 50,
  })

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // ─── Tax Math ───
  const calc = useMemo(() => {
    const { desks, daysPerWeek, pricePerDesk, employeeCount, weeksPerYear } = form
    const totalDaysPerYear = daysPerWeek * weeksPerYear

    // Direct revenue from space seeker rent
    const directRevenue = desks * pricePerDesk * totalDaysPerYear

    // Fair Market Value of donated space
    const sqft = desks * SQFT_PER_DESK
    const fmvAnnual = sqft * FMV_PER_SQFT_YEAR
    const fmvProrated = fmvAnnual * (totalDaysPerYear / WORKING_DAYS_PER_YEAR)

    // Double deduction value (IL Enterprise Zone Act)
    const doubleDeduction = fmvProrated * EZ_DEDUCTION_MULTIPLIER
    const taxSavings = doubleDeduction * IL_CORPORATE_TAX_RATE

    // Head tax offset (Social Impact argument)
    const annualHeadTax = employeeCount >= 100 ? employeeCount * HEAD_TAX_PER_EMPLOYEE * 12 : 0
    const socialImpactCredit = annualHeadTax * 0.05 // ~5% offset from goodwill/PR

    // Total economic benefit
    const totalBenefit = taxSavings + directRevenue + socialImpactCredit

    // ROI metrics
    const effectiveTaxRate = taxSavings / (directRevenue || 1)

    return {
      directRevenue,
      sqft,
      fmvProrated,
      doubleDeduction,
      taxSavings,
      annualHeadTax,
      socialImpactCredit,
      totalBenefit,
      effectiveTaxRate,
      totalDaysPerYear,
    }
  }, [form])

  const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  // ─── Active info panel ───
  const [activeInfo, setActiveInfo] = useState(null)

  return (
    <div className="tax-page">
      {/* Hero Banner */}
      <section className="tax-hero">
        <div className="container">
          <div className="tax-hero-content">
            <span className="tax-badge">
              <Landmark size={14} /> Illinois Enterprise Zone Act
            </span>
            <h1>LoopShare Tax Estimator</h1>
            <p>
              See how much your corporation can save by sharing underutilized
              office space in the Chicago Loop — with a <strong>2× tax deduction</strong> under
              35 ILCS 5/203.
            </p>
          </div>
        </div>
      </section>

      <div className="container tax-layout">
        {/* ────────── LEFT: Calculator ────────── */}
        <div className="tax-calculator" style={{ marginTop: '4rem' }}>
          <div className="tax-card">
            <div className="tax-card-header">
              <Calculator size={20} />
              <h2>Benefit Calculator</h2>
            </div>

            <div className="calc-form">
              {/* Desks */}
              <div className="calc-field">
                <label>
                  Desks to share
                  <button className="info-btn" onClick={() => setActiveInfo(activeInfo === 'desks' ? null : 'desks')}>
                    <HelpCircle size={14} />
                  </button>
                </label>
                {activeInfo === 'desks' && (
                  <p className="calc-info">Number of empty desks your company can offer to space seekers on remote-work days. Each desk ≈ 75 sq ft.</p>
                )}
                <input
                  type="range" min="1" max="100" value={form.desks}
                  onChange={e => update('desks', +e.target.value)}
                />
                <div className="calc-range-labels">
                  <span>1</span><span className="calc-value">{form.desks} desks</span><span>100</span>
                </div>
              </div>

              {/* Days per week */}
              <div className="calc-field">
                <label>
                  Days available per week
                  <button className="info-btn" onClick={() => setActiveInfo(activeInfo === 'days' ? null : 'days')}>
                    <HelpCircle size={14} />
                  </button>
                </label>
                {activeInfo === 'days' && (
                  <p className="calc-info">How many weekdays are these desks empty? Most hybrid companies have 2-3 remote days.</p>
                )}
                <div className="calc-day-btns">
                  {[1, 2, 3, 4, 5].map(d => (
                    <button
                      key={d}
                      className={`calc-day-btn ${form.daysPerWeek === d ? 'active' : ''}`}
                      onClick={() => update('daysPerWeek', d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price per desk */}
              <div className="calc-field">
                <label>
                  Rental price per desk/day
                  <button className="info-btn" onClick={() => setActiveInfo(activeInfo === 'price' ? null : 'price')}>
                    <HelpCircle size={14} />
                  </button>
                </label>
                {activeInfo === 'price' && (
                  <p className="calc-info">What you charge space seekers. Loop avg is $25-50/desk/day (vs. $75+ at WeWork).</p>
                )}
                <input
                  type="range" min="10" max="100" step="5" value={form.pricePerDesk}
                  onChange={e => update('pricePerDesk', +e.target.value)}
                />
                <div className="calc-range-labels">
                  <span>$10</span><span className="calc-value">${form.pricePerDesk}</span><span>$100</span>
                </div>
              </div>

              {/* Employees */}
              <div className="calc-field">
                <label>
                  Total employees (Chicago)
                  <button className="info-btn" onClick={() => setActiveInfo(activeInfo === 'emp' ? null : 'emp')}>
                    <HelpCircle size={14} />
                  </button>
                </label>
                {activeInfo === 'emp' && (
                  <p className="calc-info">Companies with 100+ employees pay Chicago's $21/mo Community Safety Surcharge ("Head Tax"). LoopShare participation generates social impact points.</p>
                )}
                <input
                  type="number" min="1" max="50000" className="input-field"
                  value={form.employeeCount}
                  onChange={e => update('employeeCount', +e.target.value)}
                />
              </div>

              {/* Weeks */}
              <div className="calc-field">
                <label>Weeks per year</label>
                <input
                  type="range" min="10" max="52" value={form.weeksPerYear}
                  onChange={e => update('weeksPerYear', +e.target.value)}
                />
                <div className="calc-range-labels">
                  <span>10</span><span className="calc-value">{form.weeksPerYear} weeks</span><span>52</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Facts */}
          <div className="tax-card tax-facts-card">
            <h3><FileText size={18} /> Key Facts for 2026</h3>
            <ul className="tax-facts-list">
              <li>
                <CheckCircle size={16} className="text-success" />
                <span><strong>Double Deduction:</strong> 35 ILCS 5/203 allows 2× deduction for in-kind contributions to a Designated Zone Organization in an Enterprise Zone.</span>
              </li>
              <li>
                <CheckCircle size={16} className="text-success" />
                <span><strong>Enterprise Zone 1:</strong> The Loop falls in Chicago Enterprise Zone 1. Verify your building at the Chicago Data Portal.</span>
              </li>
              <li>
                <CheckCircle size={16} className="text-success" />
                <span><strong>IL Corporate Tax:</strong> 9.5% combined rate (7% income + 2.5% replacement tax).</span>
              </li>
              <li>
                <AlertTriangle size={16} className="text-warning" />
                <span><strong>Head Tax (2026):</strong> $21/employee/month for companies with 100+ employees — the "Community Safety Surcharge."</span>
              </li>
              <li>
                <Info size={16} className="text-info" />
                <span><strong>Property Class:</strong> Building must be Class 5a (Commercial) or 5b (Industrial) for eligibility.</span>
              </li>
              <li>
                <Info size={16} className="text-info" />
                <span><strong>FMV Basis:</strong> Fair Market Value calculated at ~$50/sq ft/year for Loop Class A office space.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ────────── RIGHT: Results ────────── */}
        <div className="tax-results"style={{ marginTop: '4rem' }}>
          {/* Total Benefit */}
          <div className="tax-card tax-total-card">
            <p className="tax-total-label">Estimated Annual Economic Benefit</p>
            <p className="tax-total-amount">${fmt(calc.totalBenefit)}</p>
            <p className="tax-total-sub">per year sharing {form.desks} desks, {form.daysPerWeek} days/week</p>
          </div>

          {/* Breakdown */}
          <div className="tax-card">
            <h3 className="tax-card-header">
              <TrendingUp size={20} />
              Benefit Breakdown
            </h3>
            <div className="tax-breakdown">
              {/* Direct Revenue */}
              <div className="breakdown-row">
                <div className="breakdown-icon revenue">
                  <DollarSign size={18} />
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-label">Direct Rental Revenue</p>
                  <p className="breakdown-desc">{form.desks} desks × ${form.pricePerDesk}/day × {fmt(calc.totalDaysPerYear)} days</p>
                </div>
                <p className="breakdown-amount">${fmt(calc.directRevenue)}</p>
              </div>

              {/* Tax Savings */}
              <div className="breakdown-row highlight">
                <div className="breakdown-icon tax">
                  <BadgeDollarSign size={18} />
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-label">2× Enterprise Zone Tax Savings</p>
                  <p className="breakdown-desc">
                    FMV ${fmt(calc.fmvProrated)} × 2 × 9.5% = ${fmt(calc.taxSavings)}
                  </p>
                </div>
                <p className="breakdown-amount">${fmt(calc.taxSavings)}</p>
              </div>

              {/* Social Impact */}
              <div className="breakdown-row">
                <div className="breakdown-icon social">
                  <Users size={18} />
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-label">Social Impact Credit</p>
                  <p className="breakdown-desc">
                    {form.employeeCount >= 100
                      ? `Head Tax: ${fmt(form.employeeCount)} × $21/mo × 12 = $${fmt(calc.annualHeadTax)}/yr → ~5% offset`
                      : 'Under 100 employees — no Head Tax applies'}
                  </p>
                </div>
                <p className="breakdown-amount">${fmt(calc.socialImpactCredit)}</p>
              </div>

              <div className="breakdown-divider" />

              {/* Total */}
              <div className="breakdown-row total">
                <div className="breakdown-icon total-icon">
                  <Shield size={18} />
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-label">Total Economic Benefit (B<sub>total</sub>)</p>
                </div>
                <p className="breakdown-amount">${fmt(calc.totalBenefit)}</p>
              </div>
            </div>
          </div>

          {/* The Formula */}
          <div className="tax-card">
            <h3 className="tax-card-header">
              <FileText size={20} />
              The LoopShare Tax Equation
            </h3>
            <div className="tax-formula">
              <div className="formula-block">
                <p className="formula-text">
                  B<sub>total</sub> = (V<sub>fmv</sub> × 2 × R<sub>tax</sub>) + R<sub>seeker</sub> + S<sub>impact</sub>
                </p>
              </div>
              <div className="formula-legend">
                <div className="legend-item">
                  <span className="legend-var">V<sub>fmv</sub></span>
                  <span>Fair Market Value of space = <strong>${fmt(calc.fmvProrated)}</strong></span>
                </div>
                <div className="legend-item">
                  <span className="legend-var">2</span>
                  <span>IL Enterprise Zone deduction multiplier</span>
                </div>
                <div className="legend-item">
                  <span className="legend-var">R<sub>tax</sub></span>
                  <span>IL Corporate Tax Rate = <strong>9.5%</strong></span>
                </div>
                <div className="legend-item">
                  <span className="legend-var">R<sub>seeker</sub></span>
                  <span>Direct space seeker rent = <strong>${fmt(calc.directRevenue)}</strong></span>
                </div>
                <div className="legend-item">
                  <span className="legend-var">S<sub>impact</sub></span>
                  <span>Social Impact Credit = <strong>${fmt(calc.socialImpactCredit)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Space Metrics */}
          <div className="tax-card">
            <h3 className="tax-card-header">
              <Building2 size={20} />
              Space Metrics
            </h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <p className="metric-value">{fmt(calc.sqft)}</p>
                <p className="metric-label">sq ft shared</p>
              </div>
              <div className="metric-box">
                <p className="metric-value">{fmt(calc.totalDaysPerYear)}</p>
                <p className="metric-label">desk-days / year</p>
              </div>
              <div className="metric-box">
                <p className="metric-value">${fmt(calc.fmvProrated)}</p>
                <p className="metric-label">FMV (prorated)</p>
              </div>
              <div className="metric-box">
                <p className="metric-value">${fmt(calc.doubleDeduction)}</p>
                <p className="metric-label">2× deduction</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="tax-card tax-cta-card">
            <h3>Ready to start saving?</h3>
            <p>List your empty desks and start earning revenue while cutting your tax bill.</p>
            <div className="tax-cta-btns">
              <Link to="/host" className="btn btn-primary btn-lg">
                Go to Building Owner Dashboard <ArrowRight size={18} />
              </Link>
              <Link to="/listings" className="btn btn-outline btn-lg">
                Browse Listings
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="tax-disclaimer">
            <AlertTriangle size={14} />
            <p>
              This estimator provides illustrative projections only. Actual tax benefits
              depend on your company's specific situation, building eligibility, and partnership
              with a Designated Zone Organization (DZO). Consult a licensed CPA or tax attorney
              before making financial decisions. Rates reflect 2026 Illinois law.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
