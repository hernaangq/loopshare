import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, Map } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listings as listingsApi } from '../services/api'
import ListingCard from '../components/ListingCard'
import DayChips from '../components/DayChips'
import './Listings.css'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export default function Listings() {
  const [allListings, setAllListings] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedDay, setSelectedDay] = useState('')
  const [minDesks, setMinDesks] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listingsApi.getActive().then(data => {
      setAllListings(data)
      setFiltered(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let result = [...allListings]
    if (selectedDay) {
      result = result.filter(l =>
        l.daysAvailable && l.daysAvailable.includes(selectedDay)
      )
    }
    if (minDesks) {
      result = result.filter(l => l.desksAvailable >= parseInt(minDesks))
    }
    if (maxPrice) {
      result = result.filter(l => l.pricePerDeskPerDay <= parseFloat(maxPrice))
    }
    setFiltered(result)
  }, [selectedDay, minDesks, maxPrice, allListings])

  return (
    <div className="listings-page">
      {/* Filter Bar */}
      <div className="filters-bar">
        <div className="container-wide">
          <div className="filters-inner">
            <div className="filters-days">
              <button
                className={`badge ${selectedDay === '' ? 'active' : ''}`}
                onClick={() => setSelectedDay('')}
              >
                All days
              </button>
              {DAYS.map(day => (
                <button
                  key={day}
                  className={`badge ${selectedDay === day ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day === selectedDay ? '' : day)}
                >
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="filters-inputs">
              <div className="filter-field">
                <label>Min desks</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={minDesks}
                  onChange={e => setMinDesks(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="filter-field">
                <label>Max $/day</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="input-field"
                />
              </div>
              <Link to="/map" className="btn btn-outline" title="Map view">
                <Map size={16} /> Map
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container-wide py-8">
        <div className="listings-header">
          <p className="text-sm text-muted">
            {loading ? 'Loading...' : `${filtered.length} desk${filtered.length !== 1 ? 's' : ''} available in Chicago Loop`}
          </p>
        </div>
        <div className="grid-listings mt-4">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <Search size={48} color="var(--ls-gray-300)" />
            <h3>No desks match your filters</h3>
            <p className="text-muted">Try adjusting the day or desk count.</p>
          </div>
        )}
      </div>
    </div>
  )
}
