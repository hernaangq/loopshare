import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Users, DollarSign, Star, Building2, Wifi, Coffee, Car, Shield, Calendar, ArrowLeft, Mail } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { listings as listingsApi, bookings as bookingsApi, startups as startupsApi, dealScout as dealScoutApi } from '../services/api'
import DayChips from '../components/DayChips'
import { useAuth } from '../context/AuthContext'
import 'leaflet/dist/leaflet.css'
import { getBuildingImage } from '../utils/buildingImages'
import './ListingDetail.css'

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const AMENITY_ICONS = {
  WiFi: Wifi,
  Coffee: Coffee,
  Parking: Car,
  'Conference Rooms': Building2,
  Security: Shield,
}

const WEEKDAY_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const allDates = []
  const cursor = new Date(start)
  while (cursor <= end) {
    allDates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return allDates
}

export default function ListingDetail() {
  const { id } = useParams()
  const { isAuthenticated, role, session } = useAuth()
  const [listing, setListing] = useState(null)
  const [bookingForm, setBookingForm] = useState({ desks: 1, startDate: '', endDate: '' })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listingsApi.getById(id).then((listingData) => {
      setListing(listingData)
      setLoading(false)
    })
  }, [id])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!bookingForm.startDate || !bookingForm.endDate) return

    if (!isAuthenticated || role !== 'startup' || !session?.startupId) {
      alert('Sign in as a space seeker to reserve desks.')
      return
    }

    const availableWeekdays = new Set((listing.daysAvailable || '').split(',').map(day => day.trim()).filter(Boolean))
    const rangeDates = buildDateRange(bookingForm.startDate, bookingForm.endDate)
    if (rangeDates.length === 0) {
      alert('Select a valid date range.')
      return
    }

    const validBookingDates = rangeDates
      .filter((dateObj) => availableWeekdays.has(WEEKDAY_MAP[dateObj.getDay()]))
      .map(toIsoDate)

    if (validBookingDates.length === 0) {
      alert('Selected range has no days available for this listing.')
      return
    }

    const desksBooked = parseInt(bookingForm.desks)
    const totalForRange = desksBooked * listing.pricePerDeskPerDay * validBookingDates.length

    try {
      await Promise.all(validBookingDates.map((bookingDate) => bookingsApi.create({
        listing: { id: listing.id },
        startup: { id: parseInt(session.startupId) },
        bookingDate,
        desksBooked,
        totalPrice: desksBooked * listing.pricePerDeskPerDay,
        status: 'PENDING',
      })))
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
  const rangeDates = buildDateRange(bookingForm.startDate, bookingForm.endDate)
  const availableWeekdays = new Set((listing.daysAvailable || '').split(',').map(day => day.trim()).filter(Boolean))
  const billableDays = rangeDates.filter((dateObj) => availableWeekdays.has(WEEKDAY_MAP[dateObj.getDay()])).length
  const rangeTotal = listing.pricePerDeskPerDay * bookingForm.desks * billableDays

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

          {/* Building Owner Info */}
          <div className="detail-host">
            <div className="detail-host-avatar">
              <Building2 size={24} />
            </div>
            <div>
              <p className="font-semibold">Building owner: {host.companyName}</p>
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
                <p className="text-xs text-muted">Tax-deductible for building owners</p>
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

          {/* Location Map */}
          {building.latitude && building.longitude && (
            <>
              <div className="divider" />
              <div>
                <h3 className="detail-section-title">
                  <MapPin size={18} /> Where you'll be
                </h3>
                <div className="detail-mini-map mt-4">
                  <MapContainer
                    center={[building.latitude, building.longitude]}
                    zoom={16}
                    scrollWheelZoom={false}
                    style={{ width: '100%', height: '100%', borderRadius: '12px' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[building.latitude, building.longitude]}>
                      <Popup>
                        <strong>{building.name}</strong><br />
                        {building.address}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <p className="text-sm text-muted mt-2">
                  {building.address} · {building.neighborhood}
                </p>
              </div>
            </>
          )}
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
                <p className="text-sm text-muted">Status: PENDING. The building owner will confirm shortly.</p>
                <button className="btn btn-outline mt-4" onClick={() => setBookingSuccess(false)}>
                  Book again
                </button>
              </div>
            ) : (
              <form onSubmit={handleBook} className="booking-form">
                <div className="booking-form-grid">
                  <div className="input-group">
                    <label>Your space seeker profile</label>
                    <input
                      className="input-field"
                      value={role === 'startup' ? (session?.displayName || '') : 'Sign in as space seeker'}
                      readOnly
                    />
                  </div>
                  <div className="input-group">
                    <label>Start date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={bookingForm.startDate}
                      onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>End date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={bookingForm.endDate}
                      min={bookingForm.startDate || undefined}
                      onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})}
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
                    <span>${listing.pricePerDeskPerDay} × {bookingForm.desks} desk{bookingForm.desks > 1 ? 's' : ''} × {billableDays} day{billableDays !== 1 ? 's' : ''}</span>
                    <span>${rangeTotal.toFixed(2)}</span>
                  </div>
                  <div className="booking-line booking-total">
                    <span>Total</span>
                    <span>${rangeTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{width: '100%'}}
                  disabled={!isAuthenticated || role !== 'startup' || !session?.startupId}
                >
                  Reserve desks
                </button>
              </form>
            )}

            <p className="booking-note text-xs text-muted text-center mt-2">
              {!isAuthenticated || role !== 'startup'
                ? 'Sign in as space seeker to reserve desks.'
                : "You won't be charged yet. Building owner confirmation required."}
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
