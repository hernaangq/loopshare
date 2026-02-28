import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Rocket, Calendar, Users, DollarSign, Search, MapPin, Building2 } from 'lucide-react'
import { startups as startupsApi, bookings as bookingsApi, listings as listingsApi } from '../services/api'
import DayChips from '../components/DayChips'
import ListingCard from '../components/ListingCard'
import './Dashboard.css'

export default function StartupDashboard() {
  const [startupsList, setStartupsList] = useState([])
  const [selectedStartup, setSelectedStartup] = useState(null)
  const [myBookings, setMyBookings] = useState([])
  const [recommended, setRecommended] = useState([])

  useEffect(() => {
    startupsApi.getAll().then(setStartupsList)
  }, [])

  useEffect(() => {
    if (selectedStartup) {
      bookingsApi.getByStartup(selectedStartup.id).then(setMyBookings)

      // Recommend listings matching their days
      const days = (selectedStartup.daysNeeded || '').split(',').map(d => d.trim())
      listingsApi.getActive().then(allListings => {
        const matches = allListings.filter(l => {
          const listingDays = (l.daysAvailable || '').split(',').map(d => d.trim())
          return days.some(d => listingDays.includes(d)) && l.desksAvailable >= (selectedStartup.desksNeeded || 1)
        })
        setRecommended(matches.slice(0, 6))
      })
    }
  }, [selectedStartup])

  const cancelBooking = async (bookingId) => {
    await bookingsApi.updateStatus(bookingId, 'CANCELLED')
    bookingsApi.getByStartup(selectedStartup.id).then(setMyBookings)
  }

  // Stats
  const confirmedBookings = myBookings.filter(b => b.status === 'CONFIRMED')
  const totalSpent = confirmedBookings.reduce((s, b) => s + (b.totalPrice || 0), 0)

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Startup Dashboard</h1>
            <p className="text-muted">Find desks, manage bookings, and grow your team in the Loop.</p>
          </div>
        </div>

        {!selectedStartup ? (
          <div className="dash-select-section">
            <h2 className="mb-4">Select your startup</h2>
            <div className="host-grid">
              {startupsList.map(s => (
                <button
                  key={s.id}
                  className="host-select-card startup-card"
                  onClick={() => setSelectedStartup(s)}
                >
                  <div className="host-select-icon startup-icon">
                    <Rocket size={28} />
                  </div>
                  <h3>{s.companyName}</h3>
                  <p className="text-sm text-muted">{s.industry}</p>
                  <p className="text-xs text-muted">{s.teamSize} people · {s.desksNeeded} desks needed</p>
                  <div className="mt-2">
                    <DayChips days={s.daysNeeded} compact />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Company Bar */}
            <div className="dash-company-bar startup-bar">
              <div className="dash-company-info">
                <div className="dash-company-avatar startup-avatar">
                  <Rocket size={24} />
                </div>
                <div>
                  <h2>{selectedStartup.companyName}</h2>
                  <p className="text-sm text-muted">
                    {selectedStartup.industry} · {selectedStartup.teamSize} people
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <DayChips days={selectedStartup.daysNeeded} compact />
                <button className="btn btn-ghost" onClick={() => setSelectedStartup(null)}>
                  Switch startup
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="dash-stats">
              <div className="dash-stat-card">
                <Calendar size={20} color="var(--ls-secondary)" />
                <p className="dash-stat-num">{myBookings.length}</p>
                <p className="dash-stat-label">Total Bookings</p>
              </div>
              <div className="dash-stat-card">
                <Users size={20} color="var(--ls-primary)" />
                <p className="dash-stat-num">{selectedStartup.desksNeeded}</p>
                <p className="dash-stat-label">Desks Needed</p>
              </div>
              <div className="dash-stat-card">
                <DollarSign size={20} color="var(--ls-success)" />
                <p className="dash-stat-num">${totalSpent.toLocaleString()}</p>
                <p className="dash-stat-label">Total Spent</p>
              </div>
              <div className="dash-stat-card">
                <Building2 size={20} color="var(--ls-warning)" />
                <p className="dash-stat-num">{confirmedBookings.length}</p>
                <p className="dash-stat-label">Confirmed</p>
              </div>
            </div>

            {/* My Bookings */}
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>My Bookings</h3>
                <Link to="/listings" className="btn btn-primary">
                  <Search size={16} /> Find desks
                </Link>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Building</th>
                      <th>Host</th>
                      <th>Date</th>
                      <th>Desks</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.map(b => (
                      <tr key={b.id}>
                        <td className="font-semibold">{b.listing?.building?.name}</td>
                        <td>{b.listing?.host?.companyName}</td>
                        <td>{b.bookingDate}</td>
                        <td>{b.desksBooked}</td>
                        <td>${b.totalPrice}</td>
                        <td>
                          <span className={`chip chip-${b.status?.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === 'PENDING' && (
                            <button className="btn btn-sm btn-outline" onClick={() => cancelBooking(b.id)}>Cancel</button>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <Link to={`/listings/${b.listing?.id}`} className="btn btn-sm btn-ghost">View</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                    {myBookings.length === 0 && (
                      <tr><td colSpan="7" className="text-center text-muted py-4">No bookings yet. Find desks to get started!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommended */}
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Recommended for you</h3>
                <Link to="/listings" className="btn btn-outline btn-sm">View all</Link>
              </div>
              <p className="text-sm text-muted mb-4">
                Listings matching your schedule ({selectedStartup.daysNeeded?.replace(/,/g, ', ')}) with at least {selectedStartup.desksNeeded} desks.
              </p>
              <div className="grid-listings">
                {recommended.map(l => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
              {recommended.length === 0 && (
                <p className="text-center text-muted py-6">No exact matches right now. Try browsing all listings.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
