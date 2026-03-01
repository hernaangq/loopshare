import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Users, DollarSign, Star, Building2, Wifi, Coffee, Car, Shield, Calendar, ArrowLeft, Mail } from 'lucide-react'
import { listings as listingsApi, bookings as bookingsApi, startups as startupsApi, dealScout as dealScoutApi } from '../services/api'
import DayChips from '../components/DayChips'
import { getBuildingImage } from '../utils/buildingImages'
import './ListingDetail.css'

const AMENITY_ICONS = {
  WiFi: Wifi,
  Coffee: Coffee,
  Parking: Car,
  'Conference Rooms': Building2,
  Security: Shield,
}

export default function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [startupList, setStartupList] = useState([])
  const [bookingForm, setBookingForm] = useState({ startupId: '', desks: 1, date: '' })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listingsApi.getById(id),
      startupsApi.getAll(),
    ]).then(([listingData, startupData]) => {
      setListing(listingData)
      setStartupList(startupData)
      setLoading(false)
    })
  }, [id])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!bookingForm.startupId || !bookingForm.date) return
    try {
      await bookingsApi.create({
        listing: { id: listing.id },
        startup: { id: parseInt(bookingForm.startupId) },
        bookingDate: bookingForm.date,
        desksBooked: parseInt(bookingForm.desks),
        totalPrice: parseInt(bookingForm.desks) * listing.pricePerDeskPerDay,
        status: 'PENDING',
      })
      setBookingSuccess(true)
    } catch (err) {
      alert('Booking failed: ' + err.message)
    }
  }

  const handleAiProposal = async () => {
    if (!listing?.building?.id) {
      alert('Building data not available for this listing.')
      return
    }

    setAiGenerating(true)
    try {
      const run = await dealScoutApi.run({
        topN: 1,
        dryRun: false,
        benchmarks: [
          {
            buildingId: listing.building.id,
            reportingYear: new Date().getFullYear(),
            source: 'ui-listing-detail-ai-proposal',
          },
        ],
      })

      const opportunity = (run.opportunities || []).find(o => o.buildingId === listing.building.id) || run.opportunities?.[0]
      if (!opportunity) {
        alert('AI agent did not return an outreach proposal for this building.')
        return
      }

      const to = opportunity.contact?.email || ''
      const subject = opportunity.emailSubject || `LoopShare proposal for ${building.name}`
      const body = opportunity.emailBody || `Hi,\n\nI have a proposal for ${building.name}.\n\nBest,\nLoopShare`

      if (!to) {
        alert('Proposal generated, but no contact email was found. Check Deal Scout runs for the draft.')
        return
      }

      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      if (run.runId && opportunity.buildingId) {
        dealScoutApi.updateStatus(run.runId, opportunity.buildingId, 'SENT').catch(() => {})
      }
    } catch (err) {
      alert('AI proposal failed: ' + err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  if (loading) return <div className="container py-12 text-center">Loading...</div>
  if (!listing) return <div className="container py-12 text-center">Listing not found</div>

  const building = listing.building || {}
  const host = listing.host || {}
  const amenities = (building.amenities || '').split(',').map(a => a.trim()).filter(Boolean)

  return (
    <div className="detail-page container">
      <Link to="/listings" className="back-link">
        <ArrowLeft size={18} /> Back to listings
      </Link>

      {/* Image */}
      <div className="detail-image-grid">
        <img
          src={getBuildingImage(building)}
          alt={building.name}
          className="detail-hero-img"
        />
      </div>

      <div className="detail-layout">
        {/* Left Content */}
        <div className="detail-main">
          <div className="detail-title-row">
            <div>
              <h1 className="detail-title">{building.name}</h1>
              <p className="detail-subtitle">
                <MapPin size={15} /> {building.address}
              </p>
            </div>
            <div className="detail-rating">
              <Star size={16} fill="var(--ls-black)" stroke="var(--ls-black)" />
              <span className="font-semibold">4.{Math.floor(Math.random() * 3) + 7}</span>
            </div>
          </div>

          <div className="divider" />

          {/* Host Info */}
          <div className="detail-host">
            <div className="detail-host-avatar">
              <Building2 size={24} />
            </div>
            <div>
              <p className="font-semibold">Hosted by {host.companyName}</p>
              <p className="text-sm text-muted">{host.industry} · {host.employeeCount?.toLocaleString()} employees</p>
            </div>
          </div>

          <div className="divider" />

          {/* Description */}
          <div>
            <p className="detail-description">{listing.description}</p>
            {host.description && (
              <p className="text-sm text-muted mt-4">{host.description}</p>
            )}
          </div>

          <div className="divider" />

          {/* Days Available */}
          <div>
            <h3 className="detail-section-title">
              <Calendar size={18} /> Available days
            </h3>
            <div className="mt-2">
              <DayChips days={listing.daysAvailable} />
            </div>
          </div>

          <div className="divider" />

          {/* Details Grid */}
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <Users size={20} />
              <div>
                <p className="font-semibold">{listing.desksAvailable} desks</p>
                <p className="text-xs text-muted">Available in this listing</p>
              </div>
            </div>
            <div className="detail-info-item">
              <DollarSign size={20} />
              <div>
                <p className="font-semibold">${listing.pricePerDeskPerDay} / desk / day</p>
                <p className="text-xs text-muted">Tax-deductible for hosts</p>
              </div>
            </div>
            <div className="detail-info-item">
              <Building2 size={20} />
              <div>
                <p className="font-semibold">Floor {listing.floorNumber}</p>
                <p className="text-xs text-muted">{building.floors}-story building</p>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Amenities */}
          <div>
            <h3 className="detail-section-title">What this space offers</h3>
            <div className="amenities-grid mt-4">
              {amenities.map(amenity => {
                const Icon = AMENITY_ICONS[amenity] || Shield
                return (
                  <div key={amenity} className="amenity-item">
                    <Icon size={20} />
                    <span>{amenity}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Booking Card (Airbnb sticky card) */}
        <div className="detail-sidebar">
          <div className="booking-card">
            <div className="booking-card-price">
              <span className="booking-price-amount">${listing.pricePerDeskPerDay}</span>
              <span className="text-muted"> / desk / day</span>
            </div>

            {bookingSuccess ? (
              <div className="booking-success">
                <Shield size={32} color="var(--ls-success)" />
                <h4>Booking submitted!</h4>
                <p className="text-sm text-muted">Status: PENDING. The host will confirm shortly.</p>
                <button className="btn btn-outline mt-4" onClick={() => setBookingSuccess(false)}>
                  Book again
                </button>
              </div>
            ) : (
              <form onSubmit={handleBook} className="booking-form">
                <div className="booking-form-grid">
                  <div className="input-group">
                    <label>Your startup</label>
                    <select
                      className="input-field"
                      value={bookingForm.startupId}
                      onChange={e => setBookingForm({...bookingForm, startupId: e.target.value})}
                      required
                    >
                      <option value="">Select startup...</option>
                      {startupList.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={bookingForm.date}
                      onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Desks needed</label>
                    <input
                      type="number"
                      className="input-field"
                      min="1"
                      max={listing.desksAvailable}
                      value={bookingForm.desks}
                      onChange={e => setBookingForm({...bookingForm, desks: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="booking-summary">
                  <div className="booking-line">
                    <span>${listing.pricePerDeskPerDay} × {bookingForm.desks} desk{bookingForm.desks > 1 ? 's' : ''}</span>
                    <span>${(listing.pricePerDeskPerDay * bookingForm.desks).toFixed(2)}</span>
                  </div>
                  <div className="booking-line booking-total">
                    <span>Total</span>
                    <span>${(listing.pricePerDeskPerDay * bookingForm.desks).toFixed(2)}</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}}>
                  Reserve desks
                </button>
              </form>
            )}

            <p className="booking-note text-xs text-muted text-center mt-2">
              You won't be charged yet. Host confirmation required.
            </p>

            <button className="btn btn-outline mt-4" style={{ width: '100%' }} onClick={handleAiProposal} disabled={aiGenerating}>
              <Mail size={16} /> {aiGenerating ? 'Generating AI draft...' : 'Generate AI email proposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
