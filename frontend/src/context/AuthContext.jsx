import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hosts as hostsApi, startups as startupsApi } from '../services/api'

const STORAGE_KEY = 'loopshare-session'
const USERS_KEY = 'loopshare-users'

const AuthContext = createContext(null)

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function toSession(user) {
  return {
    role: user.role,
    username: user.username,
    displayName: user.profile?.companyName || user.username,
    startupId: user.startupId ?? null,
    hostId: user.hostId ?? null,
    profile: user.profile || {},
    loggedAt: new Date().toISOString(),
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.role === 'host' || parsed?.role === 'startup') {
          setSession(parsed)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const signUp = async ({ role, username, password, confirmPassword }) => {
    if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
      throw new Error('Username, password, and repeat password are required.')
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.')
    }
    if (password.length < 4) {
      throw new Error('Password must be at least 4 characters.')
    }

    const users = loadUsers()
    const usernameTrimmed = username.trim().toLowerCase()
    if (users.some(u => u.username.toLowerCase() === usernameTrimmed)) {
      throw new Error('That username already exists.')
    }

    const newUser = {
      id: Date.now(),
      role,
      username: username.trim(),
      password,
      profile: {},
      startupId: null,
      hostId: null,
      createdAt: new Date().toISOString(),
    }

    const nextUsers = [...users, newUser]
    saveUsers(nextUsers)

    const nextSession = toSession(newUser)
    setSession(nextSession)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    return nextSession
  }

  const login = async ({ username, password }) => {
    if (!username?.trim() || !password?.trim()) {
      throw new Error('Username and password are required.')
    }

    const users = loadUsers()
    const user = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    )

    if (!user) {
      throw new Error('Invalid credentials.')
    }

    const nextSession = toSession(user)
    setSession(nextSession)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    return nextSession
  }

  const updateProfile = async (profileUpdates) => {
    if (!session) {
      throw new Error('No active session.')
    }

    const mergedProfile = {
      ...(session.profile || {}),
      ...profileUpdates,
    }

    let startupId = session.startupId ?? null
    let hostId = session.hostId ?? null

    if (session.role === 'startup') {
      if (!mergedProfile.companyName?.trim()) {
        throw new Error('Space seeker name is required.')
      }

      const startupPayload = {
        companyName: mergedProfile.companyName,
        industry: mergedProfile.industry || 'General',
        contactName: mergedProfile.contactName || session.username,
        contactEmail: mergedProfile.contactEmail || `${session.username}@loopshare.local`,
        teamSize: Number(mergedProfile.teamSize) || 1,
        daysNeeded: 'MONDAY',
        desksNeeded: 1,
        description: mergedProfile.description || '',
      }

      const saved = startupId
        ? await startupsApi.update(startupId, startupPayload)
        : await startupsApi.create(startupPayload)
      startupId = saved?.id ?? startupId
    }

    if (session.role === 'host') {
      if (!mergedProfile.companyName?.trim()) {
        throw new Error('Building owner company name is required.')
      }

      const hostPayload = {
        companyName: mergedProfile.companyName,
        industry: mergedProfile.industry || 'General',
        contactName: mergedProfile.contactName || session.username,
        contactEmail: mergedProfile.contactEmail || `${session.username}@loopshare.local`,
        employeeCount: Number(mergedProfile.employeeCount) || 10,
        description: mergedProfile.description || '',
        building: null,
      }

      const saved = hostId
        ? await hostsApi.update(hostId, hostPayload)
        : await hostsApi.create(hostPayload)
      hostId = saved?.id ?? hostId
    }

    const users = loadUsers()
    let foundUser = false
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() !== session.username.toLowerCase()) return u
      foundUser = true
      return {
        ...u,
        role: session.role,
        profile: mergedProfile,
        startupId,
        hostId,
      }
    })

    if (!foundUser) {
      updatedUsers.push({
        id: Date.now(),
        role: session.role,
        username: session.username,
        password: '',
        profile: mergedProfile,
        startupId,
        hostId,
        createdAt: new Date().toISOString(),
      })
    }
    saveUsers(updatedUsers)

    const nextSession = {
      ...session,
      profile: mergedProfile,
      displayName: mergedProfile.companyName || session.username,
      startupId,
      hostId,
    }
    setSession(nextSession)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    return nextSession
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo(() => ({
    session,
    isAuthenticated: Boolean(session),
    role: session?.role ?? null,
    signUp,
    login,
    updateProfile,
    logout,
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
