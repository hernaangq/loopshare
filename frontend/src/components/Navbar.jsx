import { Link, useLocation } from 'react-router-dom'
import { Search, Globe, Menu, User, Building2 } from 'lucide-react'
import { useState } from 'react'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar-inner container-wide">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Building2 size={32} color="var(--ls-primary)" strokeWidth={2.5} />
          <span className="navbar-logo-text">
            Loop<span className="logo-accent">Share</span>
          </span>
        </Link>

        {/* Center Search (Airbnb Pill) */}
        <div className="navbar-search hide-mobile">
          <Link to="/listings" className="search-pill">
            <span className="search-pill-section">
              <strong>Chicago Loop</strong>
            </span>
            <span className="search-pill-divider" />
            <span className="search-pill-section">
              <strong>Any day</strong>
            </span>
            <span className="search-pill-divider" />
            <span className="search-pill-section text-muted">
              How many desks?
            </span>
            <span className="search-pill-btn">
              <Search size={14} />
            </span>
          </Link>
        </div>

        {/* Right Nav */}
        <nav className="navbar-right">
          <Link
            to="/onboarding"
            className={`navbar-link navbar-ai-btn ${location.pathname === '/onboarding' || location.pathname === '/results' ? 'active' : ''}`}
          >
            ✦ AI Match
          </Link>
          <Link
            to="/host"
            className={`navbar-link ${location.pathname === '/host' ? 'active' : ''}`}
          >
            Host your space
          </Link>
          <button className="navbar-globe hide-mobile">
            <Globe size={18} />
          </button>
          <div className="navbar-profile-wrapper">
            <button
              className="navbar-profile"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={16} />
              <div className="navbar-avatar">
                <User size={18} />
              </div>
            </button>
            {menuOpen && (
              <div className="navbar-dropdown" onClick={() => setMenuOpen(false)}>
                <Link to="/host" className="dropdown-item font-semibold">
                  Host Dashboard
                </Link>
                <Link to="/startup" className="dropdown-item font-semibold">
                  Startup Dashboard
                </Link>
                <div className="dropdown-divider" />
                <Link to="/listings" className="dropdown-item">
                  Browse Listings
                </Link>
                <Link to="/map" className="dropdown-item">
                  Map View
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
