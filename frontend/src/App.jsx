import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Listings from './pages/Listings'
import ListingDetail from './pages/ListingDetail'
import MapExplore from './pages/MapExplore'
import HostDashboard from './pages/HostDashboard'
import StartupDashboard from './pages/StartupDashboard'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/map" element={<MapExplore />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/startup" element={<StartupDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
