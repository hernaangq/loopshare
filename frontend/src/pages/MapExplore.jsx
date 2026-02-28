import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Users, DollarSign } from 'lucide-react'
import L from 'leaflet'
import { buildings as buildingsApi, listings as listingsApi } from '../services/api'
import DayChips from '../components/DayChips'
import 'leaflet/dist/leaflet.css'
import './MapExplore.css'

// Chicago Loop center
const CENTER = [41.8819, -87.6278]

// Fix default Leaflet marker icon paths (Vite/Webpack issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom marker icons using DivIcon
function createMarkerIcon(hasListings) {
  return new L.DivIcon({
    className: 'custom-div-marker',
    html: `<div class="marker-pin ${hasListings ? 'marker-active' : 'marker-inactive'}">
             <div class="marker-inner"></div>
           </div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
  })
}

// Component to fly to a building when selected
function FlyToBuilding({ building }) {
  const map = useMap()
  useEffect(() => {
    if (building?.latitude && building?.longitude) {
      map.flyTo([building.latitude, building.longitude], 17, { duration: 0.8 })
    }
  }, [building, map])
  return null
}

export default function MapExplore() {
  const [buildingsList, setBuildingsList] = useState([])
  const [listingsByBuilding, setListingsByBuilding] = useState({})
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const markerRefs = useRef({})

  useEffect(() => {
    buildingsApi.getAll().then(setBuildingsList)
    listingsApi.getActive().then(data => {
      const grouped = {}
      data.forEach(l => {
        const bid = l.building?.id
        if (bid) {
          if (!grouped[bid]) grouped[bid] = []
          grouped[bid].push(l)
        }
      })
      setListingsByBuilding(grouped)
    })
  }, [])

  const handleSidebarClick = (b) => {
    setSelectedBuilding(b)
    setTimeout(() => {
      const marker = markerRefs.current[b.id]
      if (marker) marker.openPopup()
    }, 900)
  }

  return (
    <div className="map-page">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="map-sidebar-header">
          <h2>Buildings in the Loop</h2>
          <p className="text-sm text-muted">{buildingsList.length} locations</p>
        </div>
        <div className="map-sidebar-list">
          {buildingsList.map(b => {
            const bListings = listingsByBuilding[b.id] || []
            const totalDesks = bListings.reduce((s, l) => s + l.desksAvailable, 0)
            const minPrice = bListings.length ? Math.min(...bListings.map(l => l.pricePerDeskPerDay)) : 0
            return (
              <button
                key={b.id}
                className={`map-sidebar-item ${selectedBuilding?.id === b.id ? 'active' : ''}`}
                onClick={() => handleSidebarClick(b)}
              >
                <img src={b.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200'} alt={b.name} className="sidebar-item-img" />
                <div className="sidebar-item-info">
                  <h4>{b.name}</h4>
                  <p className="text-xs text-muted">{b.neighborhood}</p>
                  <div className="sidebar-item-stats">
                    <span><Users size={12} /> {totalDesks} desks</span>
                    {minPrice > 0 && <span><DollarSign size={12} /> from ${minPrice}/day</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={CENTER}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {selectedBuilding && <FlyToBuilding building={selectedBuilding} />}

          {buildingsList.map(b => {
            if (!b.latitude || !b.longitude) return null
            const bListings = listingsByBuilding[b.id] || []
            return (
              <Marker
                key={b.id}
                position={[b.latitude, b.longitude]}
                icon={createMarkerIcon(bListings.length > 0)}
                ref={(ref) => { if (ref) markerRefs.current[b.id] = ref }}
                eventHandlers={{
                  click: () => setSelectedBuilding(b),
                }}
              >
                <Popup maxWidth={300} className="custom-popup">
                  <div className="map-info-window">
                    <h4>{b.name}</h4>
                    <p className="popup-address">{b.address}</p>
                    {bListings.length > 0 ? (
                      bListings.map(l => (
                        <Link key={l.id} to={`/listings/${l.id}`} className="map-info-listing">
                          <span className="map-info-listing-text">
                            {l.desksAvailable} desks &middot; ${l.pricePerDeskPerDay}/day
                          </span>
                          <DayChips days={l.daysAvailable} compact />
                        </Link>
                      ))
                    ) : (
                      <p className="popup-empty">No active listings in this building.</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
