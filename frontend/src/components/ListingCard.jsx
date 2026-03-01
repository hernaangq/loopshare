import { Link } from 'react-router-dom'
import { MapPin, Star, Users } from 'lucide-react'
import DayChips from './DayChips'
import { getBuildingImage } from '../utils/buildingImages'
import './ListingCard.css'

export default function ListingCard({ listing }) {
  const building = listing.building || {}
  const host = listing.host || {}

  return (
    <Link to={`/listings/${listing.id}`} className="listing-card card fade-in">
      <div className="listing-card-img-wrap">
        <img
          src={getBuildingImage(building)}
          alt={building.name}
          className="card-image"
        />
        {listing.active && (
          <span className="listing-card-badge chip chip-active">Available</span>
        )}
      </div>
      <div className="listing-card-body">
        <div className="listing-card-header">
          <h3 className="listing-card-title">{building.name}</h3>
          <div className="listing-card-rating">
            <Star size={14} fill="var(--ls-black)" stroke="var(--ls-black)" />
            <span>4.{Math.floor(Math.random() * 3) + 7}</span>
          </div>
        </div>
        <p className="listing-card-host text-muted text-sm">
          Hosted by {host.companyName || 'Corporation'}
        </p>
        <p className="listing-card-location text-muted text-sm">
          <MapPin size={13} /> {building.neighborhood || 'The Loop'}
        </p>
        <div className="listing-card-days">
          <DayChips days={listing.daysAvailable} compact />
        </div>
        <div className="listing-card-footer">
          <div className="listing-card-desks">
            <Users size={14} />
            <span>{listing.desksAvailable} desks</span>
          </div>
          <p className="listing-card-price">
            <strong>${listing.pricePerDeskPerDay}</strong>
            <span className="text-muted"> / desk / day</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
