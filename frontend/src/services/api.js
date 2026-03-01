const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  if (res.status === 204) return null
  return res.json()
}

// ─── Buildings ───
export const buildings = {
  getAll: () => request('/buildings'),
  getById: (id) => request(`/buildings/${id}`),
  search: (name) => request(`/buildings/search?name=${encodeURIComponent(name)}`),
}

// ─── Hosts ───
export const hosts = {
  getAll: () => request('/hosts'),
  getById: (id) => request(`/hosts/${id}`),
  getByBuilding: (buildingId) => request(`/hosts/building/${buildingId}`),
  create: (data) => request('/hosts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/hosts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/hosts/${id}`, { method: 'DELETE' }),
}

// ─── Startups ───
export const startups = {
  getAll: () => request('/startups'),
  getById: (id) => request(`/startups/${id}`),
  create: (data) => request('/startups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/startups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/startups/${id}`, { method: 'DELETE' }),
}

// ─── Listings ───
export const listings = {
  getAll: () => request('/listings'),
  getActive: () => request('/listings/active'),
  getById: (id) => request(`/listings/${id}`),
  getByHost: (hostId) => request(`/listings/host/${hostId}`),
  getByBuilding: (buildingId) => request(`/listings/building/${buildingId}`),
  getByDay: (day) => request(`/listings/day/${day}`),
  getByMinDesks: (min) => request(`/listings/desks/${min}`),
  create: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
}

// ─── AI Agents ───
export const agents = {
  analyze:     (body) => request('/agents/analyze',     { method: 'POST', body: JSON.stringify(body) }),
  match:       (body) => request('/agents/match',       { method: 'POST', body: JSON.stringify(body) }),
  risk:        (body) => request('/agents/risk',        { method: 'POST', body: JSON.stringify(body) }),
  outreach:    (body) => request('/agents/outreach',    { method: 'POST', body: JSON.stringify(body) }),
  orchestrate: (body) => request('/agents/orchestrate', { method: 'POST', body: JSON.stringify(body) }),
  demo:        ()     => request('/demo'),
}

// ─── Bookings ───
export const bookings = {
  getAll: () => request('/bookings'),
  getById: (id) => request(`/bookings/${id}`),
  getByStartup: (startupId) => request(`/bookings/startup/${startupId}`),
  getByListing: (listingId) => request(`/bookings/listing/${listingId}`),
  getByStatus: (status) => request(`/bookings/status/${status}`),
  create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/bookings/${id}/status?status=${status}`, { method: 'PATCH' }),
  delete: (id) => request(`/bookings/${id}`, { method: 'DELETE' }),
}
