import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Listings from './pages/Listings'
import ListingDetail from './pages/ListingDetail'
import MapExplore from './pages/MapExplore'
import HostDashboard from './pages/HostDashboard'
import StartupDashboard from './pages/StartupDashboard'
import TaxEstimator from './pages/TaxEstimator'
import Login from './pages/Login'
import SignIn from './pages/SignIn'
import EditProfile from './pages/EditProfile'
import ProtectedRoute from './components/ProtectedRoute'
import Onboarding from './pages/Onboarding'
import Results from './pages/Results'
import BuildingIntel from './pages/BuildingIntel'
import LoopMonitor from './pages/LoopMonitor'
import FindNewHost from './pages/FindNewHost'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<Login />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/map" element={<MapExplore />} />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/host"
            element={(
              <ProtectedRoute allowedRoles={['host']}>
                <HostDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/startup"
            element={(
              <ProtectedRoute allowedRoles={['startup']}>
                <StartupDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/taxes"
            element={(
              <ProtectedRoute allowedRoles={['host']}>
                <TaxEstimator />
              </ProtectedRoute>
            )}
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/results" element={<Results />} />
          <Route path="/intel/:buildingId" element={<BuildingIntel />} />
          <Route path="/monitor" element={<LoopMonitor />} />
          <Route path="/find-host" element={<FindNewHost />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
