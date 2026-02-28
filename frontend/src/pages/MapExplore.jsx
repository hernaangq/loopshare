import { useEffect, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Link } from 'react-router-dom'
import { Building2, Users, DollarSign, MapPin } from 'lucide-react'
import { buildings as buildingsApi, listings as listingsApi } from '../services/api'
import DayChips from '../components/DayChips'
import './MapExplore.css'

// Chicago Loop center
const CENTER = { lat: 41.8819, lng: -87.6278 }

const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

const containerStyle = { width: '100%', height: '100%' }

export default function MapExplore() {
  const [buildingsList, setBuildingsList] = useState([])
  const [listingsByBuilding, setListingsByBuilding] = useState({})
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [map, setMap] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
  })

  useEffect(() => {
    buildingsApi.getAll().then(data => {
      setBuildingsList(data)
    })
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

  const onLoad = useCallback((map) => setMap(map), [])

  if (loadError) {
    return (
      <div className="map-page">
        <div className="map-fallback container">
          <MapPin size={48} color="var(--ls-primary)" />
          <h2>Map View</h2>
          <p className="text-muted mb-4">
            To enable the interactive map, add your Google Maps API key as <code>VITE_GOOGLE_MAPS_KEY</code> in a <code>.env</code> file in the frontend folder.
          </p>
          <div className="buildings-list-fallback">
            {buildingsList.map(b => {
              const bListings = listingsByBuilding[b.id] || []
              return (
                <div key={b.id} className="building-fallback-card">
                  <img src={b.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400'} alt={b.name} />
                  <div>
                    <h3>{b.name}</h3>
                    <p className="text-sm text-muted">{b.address}</p>
                    <p className="text-sm">{bListings.length} listing(s) · {bListings.reduce((s, l) => s + l.desksAvailable, 0)} desks</p>
                    {bListings.length > 0 && (
                      <Link to={`/listings/${bListings[0].id}`} className="btn btn-sm btn-primary mt-2">View listing</Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="map-page"><div className="container py-12 text-center">Loading map...</div></div>
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
                onClick={() => {
                  setSelectedBuilding(b)
                  if (map && b.latitude && b.longitude) {
                    map.panTo({ lat: b.latitude, lng: b.longitude })
                    map.setZoom(17)
                  }
                }}
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
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={CENTER}
          zoom={15}
          onLoad={onLoad}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {buildingsList.map(b => {
            if (!b.latitude || !b.longitude) return null
            const bListings = listingsByBuilding[b.id] || []
            return (
              <Marker
                key={b.id}
                position={{ lat: b.latitude, lng: b.longitude }}
                title={b.name}
                onClick={() => setSelectedBuilding(b)}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: bListings.length > 0 ? '#FF385C' : '#767676',
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: '#fff',
                  scale: 1.8,
                  anchor: { x: 12, y: 24 },
                }}
              />
            )
          })}

          {selectedBuilding && selectedBuilding.latitude && (
            <InfoWindow
              position={{ lat: selectedBuilding.latitude, lng: selectedBuilding.longitude }}
              onCloseClick={() => setSelectedBuilding(null)}
            >
              <div className="map-info-window">
                <h4>{selectedBuilding.name}</h4>
                <p className="text-xs text-muted">{selectedBuilding.address}</p>
                {(listingsByBuilding[selectedBuilding.id] || []).map(l => (
                  <Link key={l.id} to={`/listings/${l.id}`} className="map-info-listing">
                    <span>{l.desksAvailable} desks · ${l.pricePerDeskPerDay}/day</span>
                    <DayChips days={l.daysAvailable} compact />
                  </Link>
                ))}
                {(listingsByBuilding[selectedBuilding.id] || []).length === 0 && (
                  <p className="text-xs text-muted mt-2">No active listings in this building.</p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  )
}
