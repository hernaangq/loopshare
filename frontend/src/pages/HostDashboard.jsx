import { useEffect, useState } from 'react'
import { Building2, Plus, Users, DollarSign, TrendingUp, Eye, Calculator, ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { hosts as hostsApi, listings as listingsApi, bookings as bookingsApi, buildings as buildingsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import DayChips from '../components/DayChips'
import './Dashboard.css'

export default function HostDashboard() {
  const { session } = useAuth()
  const [selectedHost, setSelectedHost] = useState(null)
  const [hostListings, setHostListings] = useState([])
  const [hostBookings, setHostBookings] = useState([])
  const [allBuildings, setAllBuildings] = useState([])
  const [showNewListing, setShowNewListing] = useState(false)
  const [newListing, setNewListing] = useState({
    buildingId: '', daysAvailable: '', desksAvailable: '', pricePerDeskPerDay: '', floorNumber: '', description: ''
  })

  useEffect(() => {
    buildingsApi.getAll().then(setAllBuildings)
  }, [])

  useEffect(() => {
    if (session?.hostId) {
      hostsApi.getById(session.hostId).then(setSelectedHost)
      return
    }

    if (session?.role === 'host' && session?.profile?.companyName) {
      setSelectedHost({
        id: null,
        companyName: session.profile.companyName,
        industry: session.profile.industry,
        building: session.profile.buildingId ? { id: session.profile.buildingId, name: 'Selected building' } : null,
      })
      return
    }

    setSelectedHost(null)
  }, [session])

  useEffect(() => {
    if (selectedHost?.id) {
      listingsApi.getByHost(selectedHost.id).then(data => {
        setHostListings(data)
        // Fetch bookings for all host listings
        Promise.all(data.map(l => bookingsApi.getByListing(l.id)))
          .then(results => setHostBookings(results.flat()))
      })
    } else {
      setHostListings([])
      setHostBookings([])
    }
  }, [selectedHost])

  const handleCreateListing = async (e) => {
    e.preventDefault()
    if (!selectedHost?.id) {
      alert('Complete and save your profile first.')
      return
    }
    const selectedDays = newListing.daysAvailable
    try {
      await listingsApi.create({
        host: { id: selectedHost.id },
        building: { id: parseInt(newListing.buildingId) },
        daysAvailable: selectedDays,
        desksAvailable: parseInt(newListing.desksAvailable),
        pricePerDeskPerDay: parseFloat(newListing.pricePerDeskPerDay),
        floorNumber: parseInt(newListing.floorNumber) || null,
        description: newListing.description,
        active: true,
      })
      setShowNewListing(false)
      setNewListing({ buildingId: '', daysAvailable: '', desksAvailable: '', pricePerDeskPerDay: '', floorNumber: '', description: '' })
      listingsApi.getByHost(selectedHost.id).then(setHostListings)
    } catch (err) {
      alert('Error creating listing: ' + err.message)
    }
  }

  const handleBookingAction = async (bookingId, status) => {
    await bookingsApi.updateStatus(bookingId, status)
    // Refresh bookings
    Promise.all(hostListings.map(l => bookingsApi.getByListing(l.id)))
      .then(results => setHostBookings(results.flat()))
  }

  const toggleDay = (day) => {
    const current = newListing.daysAvailable ? newListing.daysAvailable.split(',') : []
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    setNewListing({ ...newListing, daysAvailable: updated.join(',') })
  }

  // Stats
  const totalDesks = hostListings.reduce((s, l) => s + (l.desksAvailable || 0), 0)
  const totalRevenue = hostBookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((s, b) => s + (b.totalPrice || 0), 0)
  const pendingBookings = hostBookings.filter(b => b.status === 'PENDING')
  const confirmedBookings = hostBookings.filter(b => b.status === 'CONFIRMED')
  const cancelledBookings = hostBookings.filter(b => b.status === 'CANCELLED')
  const bookedDesks = confirmedBookings.reduce((sum, booking) => sum + (booking.desksBooked || 0), 0)
  const avgBookingValue = confirmedBookings.length
    ? Math.round(totalRevenue / confirmedBookings.length)
    : 0

  return (
    <div className="dashboard">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Manage your next bookings</h1>
            <p className="text-muted">Manage your desk listings and upcoming booking requests.</p>
          </div>
        </div>

        <div className="dash-page-image dash-page-image-host" aria-hidden="true" />

        {!selectedHost ? (
          <>
            <div className="dash-section">
              <p className="text-muted">No renters yet.</p>
            </div>
            <div className="dash-estimator-spot">
              <div className="dash-estimator-card">
                <div className="dash-estimator-icon">
                  <Calculator size={20} />
                </div>
                <div>
                  <h2>Tax Estimator</h2>
                  <p className="text-muted">Estimate your Enterprise Zone tax benefit while you manage bookings.</p>
                </div>
                <Link to="/taxes" className="btn btn-secondary">
                  Open Estimator <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Company Info Bar */}
            <div className="dash-company-bar">
              <div className="dash-company-info">
                <div className="dash-company-avatar">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2>{selectedHost.companyName}</h2>
                  <p className="text-sm text-muted">
                    {selectedHost.industry} · {selectedHost.building?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="dash-stats">
              <div className="dash-stat-card">
                <Users size={20} color="var(--ls-primary)" />
                <p className="dash-stat-num">{totalDesks}</p>
                <p className="dash-stat-label">Total Desks Listed</p>
              </div>
              <div className="dash-stat-card">
                <Eye size={20} color="var(--ls-secondary)" />
                <p className="dash-stat-num">{hostListings.length}</p>
                <p className="dash-stat-label">Active Listings</p>
              </div>
              <div className="dash-stat-card">
                <DollarSign size={20} color="var(--ls-success)" />
                <p className="dash-stat-num">${totalRevenue.toLocaleString()}</p>
                <p className="dash-stat-label">Revenue (Confirmed)</p>
              </div>
              <div className="dash-stat-card">
                <TrendingUp size={20} color="var(--ls-warning)" />
                <p className="dash-stat-num">${(totalRevenue * 2).toLocaleString()}</p>
                <p className="dash-stat-label">Tax Deduction (2x)</p>
              </div>
            </div>

            <div className="dash-highlight-grid">
              <div className="dash-highlight-card">
                <h3>Quick actions</h3>
                <div className="dash-action-row">
                  <button className="btn btn-primary" onClick={() => setShowNewListing(true)}>
                    <Plus size={16} /> New listing
                  </button>
                  <Link to="/taxes" className="btn btn-secondary">
                    <Calculator size={16} /> Tax Estimator
                  </Link>
                  <Link to="/map" className="btn btn-outline">
                    <Compass size={16} /> Map view
                  </Link>
                </div>
              </div>

              <div className="dash-highlight-card">
                <h3>Portfolio snapshot</h3>
                <div className="dash-inline-metrics">
                  <p><strong>{pendingBookings.length}</strong> pending requests</p>
                  <p><strong>{confirmedBookings.length}</strong> confirmed bookings</p>
                  <p><strong>{cancelledBookings.length}</strong> cancelled bookings</p>
                  <p><strong>{bookedDesks}</strong> desks booked this period</p>
                  <p><strong>${avgBookingValue.toLocaleString()}</strong> average booking value</p>
                </div>
              </div>
            </div>

            {/* Listings */}
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Your Listings</h3>
                <button className="btn btn-primary" onClick={() => setShowNewListing(!showNewListing)}>
                  <Plus size={16} /> New Listing
                </button>
              </div>

              {showNewListing && (
                <form className="new-listing-form" onSubmit={handleCreateListing}>
                  <h4>Create a new listing</h4>
                  <div className="form-grid">
                    <div className="input-group">
                      <label>Building</label>
                      <select className="input-field" value={newListing.buildingId} onChange={e => setNewListing({...newListing, buildingId: e.target.value})} required>
                        <option value="">Select building...</option>
                        {allBuildings.map(b => (
                          <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Days Available</label>
                      <DayChips days={newListing.daysAvailable} selectable onToggle={toggleDay} />
                    </div>
                    <div className="input-group">
                      <label>Desks Available</label>
                      <input className="input-field" type="number" min="1" value={newListing.desksAvailable} onChange={e => setNewListing({...newListing, desksAvailable: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>Price per Desk / Day ($)</label>
                      <input className="input-field" type="number" min="1" step="0.01" value={newListing.pricePerDeskPerDay} onChange={e => setNewListing({...newListing, pricePerDeskPerDay: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>Floor Number</label>
                      <input className="input-field" type="number" min="1" value={newListing.floorNumber} onChange={e => setNewListing({...newListing, floorNumber: e.target.value})} />
                    </div>
                    <div className="input-group" style={{gridColumn: '1 / -1'}}>
                      <label>Description</label>
                      <textarea className="input-field" rows="3" value={newListing.description} onChange={e => setNewListing({...newListing, description: e.target.value})} placeholder="Describe the space..." />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button type="submit" className="btn btn-primary">Create Listing</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowNewListing(false)}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="dash-table-wrap mt-4">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Building</th>
                      <th>Floor</th>
                      <th>Days</th>
                      <th>Desks</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostListings.map(l => (
                      <tr key={l.id}>
                        <td className="font-semibold">{l.building?.name}</td>
                        <td>{l.floorNumber}</td>
                        <td><DayChips days={l.daysAvailable} compact /></td>
                        <td>{l.desksAvailable}</td>
                        <td>${l.pricePerDeskPerDay}</td>
                        <td><span className={`chip ${l.active ? 'chip-active' : 'chip-cancelled'}`}>{l.active ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Incoming Bookings */}
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Incoming Bookings {pendingBookings.length > 0 && <span className="pending-count">{pendingBookings.length}</span>}</h3>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Space Seeker</th>
                      <th>Date</th>
                      <th>Desks</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostBookings.map(b => (
                      <tr key={b.id}>
                        <td className="font-semibold">{b.startup?.companyName}</td>
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
                            <div className="flex gap-2">
                              <button className="btn btn-sm btn-primary" onClick={() => handleBookingAction(b.id, 'CONFIRMED')}>Confirm</button>
                              <button className="btn btn-sm btn-outline" onClick={() => handleBookingAction(b.id, 'CANCELLED')}>Decline</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {hostBookings.length === 0 && (
                      <tr><td colSpan="6" className="text-center text-muted py-4">No bookings yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
