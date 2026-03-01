import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Building2, ArrowRight, MapPin, Map } from 'lucide-react'
import { listings as listingsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ListingCard from '../components/ListingCard'
import { LOOP_ZONES, SEARCH_DAYS, SEARCH_STORAGE_KEY } from '../constants/searchOptions'
import ctaImage from '../images/cta.png'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const [featuredListings, setFeaturedListings] = useState([])
  const [searchForm, setSearchForm] = useState({
    neighborhood: 'The Loop',
    day: '',
    desks: '',
  })

  const buildingOwnerCtaTarget = isAuthenticated
    ? (role === 'host' ? '/host' : '/login')
    : '/login'

  const spaceSeekerCtaTarget = isAuthenticated
    ? (role === 'startup' ? '/startup' : '/login')
    : '/login'

  useEffect(() => {
    listingsApi.getActive().then(data => setFeaturedListings(data.slice(0, 4)))
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      setSearchForm({
        neighborhood: parsed.neighborhood ?? 'The Loop',
        day: parsed.day || '',
        desks: parsed.desks || '',
      })
    } catch {
      localStorage.removeItem(SEARCH_STORAGE_KEY)
    }
  }, [])

  const handleHeroSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchForm.neighborhood) params.set('neighborhood', searchForm.neighborhood)
    if (searchForm.day) params.set('day', searchForm.day)
    if (searchForm.desks) params.set('desks', searchForm.desks)

    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(searchForm))
    navigate(`/listings?${params.toString()}`)
  }

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${ctaImage})` }} />
        <div className="hero-content container">
          <div className="hero-simple">
            <h1 className="hero-title">
              Shared desks in <span className="hero-highlight">Chicago Loop</span>
            </h1>
            <p className="hero-subtitle">
              Use underused vacant office space and bring life back to the Loop.
            </p>

            <div className="hero-search">
              <form className="hero-search-bar" onSubmit={handleHeroSearch}>
                <div className="hero-search-section">
                  <label>Neighborhood</label>
                  <select
                    value={searchForm.neighborhood}
                    onChange={e => setSearchForm({ ...searchForm, neighborhood: e.target.value })}
                  >
                    {LOOP_ZONES.map((zone) => (
                      <option key={zone.label} value={zone.value}>{zone.label}</option>
                    ))}
                  </select>
                </div>
                <span className="hero-search-divider" />
                <div className="hero-search-section">
                  <label>Day</label>
                  <select
                    value={searchForm.day}
                    onChange={e => setSearchForm({ ...searchForm, day: e.target.value })}
                  >
                    {SEARCH_DAYS.map((dayOption) => (
                      <option key={dayOption.label} value={dayOption.value}>{dayOption.label}</option>
                    ))}
                  </select>
                </div>
                <span className="hero-search-divider" />
                <div className="hero-search-section">
                  <label>Desks</label>
                  <input
                    type="number"
                    placeholder="How many?"
                    min="1"
                    value={searchForm.desks}
                    onChange={e => setSearchForm({ ...searchForm, desks: e.target.value })}
                  />
                </div>
                <button type="submit" className="hero-search-btn" aria-label="Search listings">
                  <Search size={20} />
                </button>
              </form>
            </div>

            <Link to="/map" className="hero-map-btn">
              <Map size={18} /> Explore on map
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section how-it-works" style={{ marginTop: '4rem' }}>
        <div className="container">
          <h2 className="section-title text-center mb-6">How LoopShare works</h2>
          <div className="hiw-grid">
            <div className="hiw-card">
              <div className="hiw-icon">
                <Building2 size={32} />
              </div>
              <h3>Building owners list ghost desks</h3>
              <p>Corporations post empty desks on days their teams work remotely. Turn vacancy into revenue + earn a double tax deduction.</p>
            </div>
            <div className="hiw-card">
              <div className="hiw-icon">
                <Search size={32} />
              </div>
              <h3>Space seekers search & book</h3>
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

      
      {/* Featured Listings */}
      <section className="section container featured-section">
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
      

      {/* CTA for both user types */}
      <section className="section container home-cta-section" style={{ marginTop: '4rem' }}>
        <div className="cta-grid">
          <div className="cta-card cta-host">
            <h3>For Building Owners</h3>
            <p>Turn empty desks into tax-deductible revenue under the Illinois Enterprise Zone Act.</p>
            <Link to={buildingOwnerCtaTarget} className="btn btn-primary btn-lg">
              Become a building owner <ArrowRight size={18} />
            </Link>
          </div>
          <div className="cta-card cta-startup">
            <h3>For Space Seekers</h3>
            <p>Get premium Loop office space for your team — daily, flexible, affordable.</p>
            <Link to={spaceSeekerCtaTarget} className="btn btn-secondary btn-lg">
              Find a desk <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
