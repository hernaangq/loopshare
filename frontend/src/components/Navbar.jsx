import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Globe, Menu, User, Building2, Radar, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const profileMenuRef = useRef(null)
  const { isAuthenticated, role, logout } = useAuth()

  const dashboardPath = role === 'host' ? '/host' : '/startup'
  const dashboardLabel = role === 'host' ? 'Building Owner Dashboard' : 'Space Seeker Dashboard'

  useEffect(() => {
    let lastScrollY = window.scrollY
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setVisible(true)
      } else {
        setVisible(false)
      }
      lastScrollY = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

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
    <header className="navbar" style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}>
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
            to="/host"
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
