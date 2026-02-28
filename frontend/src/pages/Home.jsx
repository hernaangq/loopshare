import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Building2, Users, TrendingUp, ArrowRight, MapPin, Shield } from 'lucide-react'
import { listings as listingsApi, buildings as buildingsApi } from '../services/api'
import ListingCard from '../components/ListingCard'
import './Home.css'

export default function Home() {
  const [featuredListings, setFeaturedListings] = useState([])
  const [buildingCount, setBuildingCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    listingsApi.getActive().then(data => setFeaturedListings(data.slice(0, 4)))
    buildingsApi.getAll().then(data => setBuildingCount(data.length))
  }, [])

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content container">
          <h1 className="hero-title">
            Find your startup's next
            <br />
            <span className="hero-highlight">home in the Loop</span>
          </h1>
          <p className="hero-subtitle">
            Premium corporate desks, daily rentals. Save money while revitalizing Chicago's downtown.
          </p>

          {/* Airbnb-style search bar */}
          <div className="hero-search">
            <div className="hero-search-bar">
              <div className="hero-search-section">
                <label>Neighborhood</label>
                <input placeholder="The Loop, West Loop..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <span className="hero-search-divider" />
              <div className="hero-search-section">
                <label>Day</label>
                <select>
                  <option value="">Any day</option>
                  <option>MONDAY</option>
                  <option>TUESDAY</option>
                  <option>WEDNESDAY</option>
                  <option>THURSDAY</option>
                  <option>FRIDAY</option>
                </select>
              </div>
              <span className="hero-search-divider" />
              <div className="hero-search-section">
                <label>Desks</label>
                <input type="number" placeholder="How many?" min="1" />
              </div>
              <Link to="/listings" className="hero-search-btn">
                <Search size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <Building2 size={24} color="var(--ls-primary)" />
              <div>
                <p className="stat-number">{buildingCount}</p>
                <p className="stat-label">Buildings</p>
              </div>
            </div>
            <div className="stat-item">
              <Users size={24} color="var(--ls-primary)" />
              <div>
                <p className="stat-number">
                  {featuredListings.reduce((sum, l) => sum + (l.desksAvailable || 0), 0)}+
                </p>
                <p className="stat-label">Desks Available</p>
              </div>
            </div>
            <div className="stat-item">
              <TrendingUp size={24} color="var(--ls-primary)" />
              <div>
                <p className="stat-number">2x</p>
                <p className="stat-label">Tax Deduction</p>
              </div>
            </div>
            <div className="stat-item">
              <Shield size={24} color="var(--ls-primary)" />
              <div>
                <p className="stat-number">35 ILCS</p>
                <p className="stat-label">Enterprise Zone Act</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Featured desks in the Loop</h2>
            <p className="text-muted">Premium corporate space, available daily.</p>
          </div>
          <Link to="/listings" className="btn btn-outline">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid-listings mt-6">
          {featuredListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="section how-it-works">
        <div className="container">
          <h2 className="section-title text-center mb-6">How LoopShare works</h2>
          <div className="hiw-grid">
            <div className="hiw-card">
              <div className="hiw-icon">
                <Building2 size={32} />
              </div>
              <h3>Hosts list ghost desks</h3>
              <p>Corporations post empty desks on days their teams work remotely. Turn vacancy into revenue + earn a double tax deduction.</p>
            </div>
            <div className="hiw-card">
              <div className="hiw-icon">
                <Search size={32} />
              </div>
              <h3>Startups search & book</h3>
              <p>Filter by day, desk count, and neighborhood. Book premium Loop office space at a fraction of traditional coworking costs.</p>
            </div>
            <div className="hiw-card">
              <div className="hiw-icon">
                <MapPin size={32} />
              </div>
              <h3>Meet in the Loop</h3>
              <p>Show up, plug in, and work from iconic Chicago buildings. Support local cafes and help revitalize downtown.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for both user types */}
      <section className="section container">
        <div className="cta-grid">
          <div className="cta-card cta-host">
            <h3>For Corporations</h3>
            <p>Turn empty desks into tax-deductible revenue under the Illinois Enterprise Zone Act.</p>
            <Link to="/host" className="btn btn-primary btn-lg">
              Start hosting <ArrowRight size={18} />
            </Link>
          </div>
          <div className="cta-card cta-startup">
            <h3>For Startups</h3>
            <p>Get premium Loop office space for your team — daily, flexible, affordable.</p>
            <Link to="/startup" className="btn btn-secondary btn-lg">
              Find a desk <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
