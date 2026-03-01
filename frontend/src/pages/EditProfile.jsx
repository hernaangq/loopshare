import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import editProfileSpaceSeekerBg from '../images/edit_profile1.png'
import editProfileBuildingOwnerBg from '../images/edit_profile2.png'
import './EditProfile.css'

export default function EditProfile() {
  const { session, role, updateProfile } = useAuth()
  const profileBackground = role === 'host' ? editProfileBuildingOwnerBg : editProfileSpaceSeekerBg
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: session?.profile?.companyName || '',
    industry: session?.profile?.industry || '',
    contactName: session?.profile?.contactName || '',
    contactEmail: session?.profile?.contactEmail || '',
    description: session?.profile?.description || '',
    streetNumber: session?.profile?.streetNumber || '',
    streetName: session?.profile?.streetName || '',
    city: session?.profile?.city || 'Chicago',
    state: session?.profile?.state || 'IL',
    zipCode: session?.profile?.zipCode || '',
    employeeCount: session?.profile?.employeeCount || '',
    teamSize: session?.profile?.teamSize || '',
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateProfile(form)
      setMessage('Profile saved successfully.')
    } catch (err) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={`profile-page ${role === 'host' ? 'profile-page-host' : 'profile-page-startup'}`}
      style={{ '--profile-bg-image': `url(${profileBackground})` }}
    >
      <div className="container">
        <div className="profile-card">
        <h1>Edit profile</h1>
        <p>Complete your {role === 'host' ? 'building owner' : 'space seeker'} data for bookings and dashboards.</p>

        <form className="profile-form" onSubmit={handleSave}>
          <div className="input-group">
            <label>{role === 'host' ? 'Company name' : 'Space seeker name'}</label>
            <input
              className="input-field"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Industry</label>
            <input
              className="input-field"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>

          <div className="input-group two-col">
            <div>
              <label>Contact name</label>
              <input
                className="input-field"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div>
              <label>Contact email</label>
              <input
                type="email"
                className="input-field"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>

          {role === 'host' ? (
            <>
              <div className="input-group two-col">
                <div>
                  <label>Street number</label>
                  <input
                    className="input-field"
                    value={form.streetNumber}
                    onChange={(e) => setForm({ ...form, streetNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label>Street name</label>
                  <input
                    className="input-field"
                    value={form.streetName}
                    onChange={(e) => setForm({ ...form, streetName: e.target.value })}
                  />
                </div>
              </div>
              <div className="input-group two-col">
                <div>
                  <label>City</label>
                  <input
                    className="input-field"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <label>State</label>
                  <input
                    className="input-field"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>ZIP code</label>
                <input
                  className="input-field"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Employee count</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={form.employeeCount}
                  onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Team size</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label>Description</label>
            <textarea
              className="input-field"
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <p className="profile-error">{error}</p>}
          {message && <p className="profile-success">{message}</p>}

          <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
        </div>
      </div>
    </section>
  )
}
