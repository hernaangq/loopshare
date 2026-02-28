import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/listings">Browse Desks</Link>
            <Link to="/map">Map View</Link>
            <a href="#">How it Works</a>
          </div>
          <div className="footer-col">
            <h4>For Hosts</h4>
            <Link to="/host">Host Dashboard</Link>
            <a href="#">Tax Benefits (35 ILCS 5/203)</a>
            <a href="#">List Your Space</a>
          </div>
          <div className="footer-col">
            <h4>For Startups</h4>
            <Link to="/startup">Startup Dashboard</Link>
            <a href="#">Enterprise Zone Savings</a>
            <a href="#">Find Space</a>
          </div>
          <div className="footer-col">
            <h4>About</h4>
            <a href="#">Our Mission</a>
            <a href="#">Chicago Loop Recovery</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-brand">
            <Building2 size={20} color="var(--ls-primary)" />
            <span>© 2026 LoopShare — Revitalizing the Chicago Loop</span>
          </div>
          <div className="footer-links-bottom">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
