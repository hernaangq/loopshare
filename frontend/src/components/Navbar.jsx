import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Globe, Menu, User, Building2, Radar, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LOOP_ZONES, SEARCH_DAYS, SEARCH_STORAGE_KEY } from '../constants/searchOptions'
import './Navbar.css'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchForm, setSearchForm] = useState({
    neighborhood: 'The Loop',
    day: '',
    desks: '',
  })
  const profileMenuRef = useRef(null)
  const { isAuthenticated, role, logout } = useAuth()
  const hostYourSpaceTarget = isAuthenticated && role === 'startup'
    ? {
      pathname: '/login',
      state: {
        reason: 'space-seeker-host-intent',
        from: '/host',
      },
    }
    : '/host'

  const dashboardPath = role === 'host' ? '/host' : '/startup'
  const dashboardLabel = role === 'host' ? 'Building Owner Dashboard' : 'Space Seeker Dashboard'
  const hideTopSearch = location.pathname === '/' || location.pathname.startsWith('/host') || location.pathname.startsWith('/taxes')

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSearchForm({
          neighborhood: parsed.neighborhood ?? 'The Loop',
          day: parsed.day || '',
          desks: parsed.desks || '',
        })
      }
    } catch {
      localStorage.removeItem(SEARCH_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/listings') {
      const params = new URLSearchParams(location.search)
      setSearchForm({
        neighborhood: params.get('neighborhood') ?? 'The Loop',
        day: params.get('day') || '',
        desks: params.get('desks') || '',
      })
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuOpen) return
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleTopSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchForm.neighborhood.trim()) params.set('neighborhood', searchForm.neighborhood.trim())
    if (searchForm.day) params.set('day', searchForm.day)
    if (searchForm.desks) params.set('desks', searchForm.desks)

    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(searchForm))
    navigate(`/listings?${params.toString()}`)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner container-wide">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="loop-mark" aria-hidden="true">
            <div className="loop-mark-ring">
              <img src="/ICON.png" alt="LoopShare logo mark" />
            </div>
          </div>
          <span className="navbar-logo-text">
            Loop<span className="logo-accent">Share</span>
          </span>
        </Link>

        {/* Center Search (Airbnb Pill) */}
        {!hideTopSearch && <div className="navbar-search hide-mobile">
          <form className="search-pill search-pill-form" onSubmit={handleTopSearch}>
            <select
              className="search-pill-input search-pill-select"
              value={searchForm.neighborhood}
              onChange={(e) => setSearchForm({ ...searchForm, neighborhood: e.target.value })}
              aria-label="Neighborhood"
            >
              {LOOP_ZONES.map((zone) => (
                <option key={zone.label} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
            <span className="search-pill-divider" />
            <select
              className="search-pill-input search-pill-select"
              value={searchForm.day}
              onChange={(e) => setSearchForm({ ...searchForm, day: e.target.value })}
              aria-label="Day"
            >
              {SEARCH_DAYS.map((dayOption) => (
                <option key={dayOption.label} value={dayOption.value}>
                  {dayOption.label}
                </option>
              ))}
            </select>
            <span className="search-pill-divider" />
            <input
              type="number"
              min="1"
              className="search-pill-input"
              value={searchForm.desks}
              onChange={(e) => setSearchForm({ ...searchForm, desks: e.target.value })}
              placeholder="How many desks?"
              aria-label="Desks"
            />
            <button type="submit" className="search-pill-btn" aria-label="Search listings">
              <Search size={14} />
            </button>
          </form>
        </div>}

        {/* Right Nav */}
        <nav className="navbar-right">
          <Link
            to="/onboarding"
            className={`navbar-link navbar-ai-btn ${location.pathname === '/onboarding' || location.pathname === '/results' ? 'active' : ''}`}
          >
            <Sparkles size={14} /> AI Match
          </Link>
          <Link
            to="/find-host"
            className={`navbar-link navbar-find-host-btn ${location.pathname === '/find-host' ? 'active' : ''}`}
          >
            <Radar size={14} /> Find New Host
          </Link>
          <Link
            to={hostYourSpaceTarget}
            className={`navbar-link navbar-host-btn ${location.pathname === '/host' ? 'active' : ''}`}
          >
            Host your space
          </Link>
          <button className="navbar-globe hide-mobile">
            <Globe size={18} />
          </button>
          <div className="navbar-profile-wrapper" ref={profileMenuRef}>
            <button
              className="navbar-profile"
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={16} />
              <div className="navbar-avatar">
                <User size={18} />
              </div>
            </button>
            {menuOpen && (
              <div className="navbar-dropdown" onClick={() => setMenuOpen(false)}>
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath} className="dropdown-item font-semibold">
                      {dashboardLabel}
                    </Link>
                    <Link to="/profile" className="dropdown-item font-semibold">
                      Edit Profile
                    </Link>
                    {role === 'host' && (
                      <Link to="/taxes" className="dropdown-item font-semibold">
                        Tax Estimator
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/signin" className="dropdown-item font-semibold">
                      Sign up
                    </Link>
                    <Link to="/login" className="dropdown-item font-semibold">
                      Log in
                    </Link>
                  </>
                )}
                <div className="dropdown-divider" />
                <Link to="/listings" className="dropdown-item">
                  Browse Listings
                </Link>
                <Link to="/map" className="dropdown-item">
                  Map View
                </Link>
                {isAuthenticated && (
                  <>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                      Sign out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
