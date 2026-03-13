import { createContext, useContext, useEffect, useState } from 'react'
import { get, post } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we have a stored token
    const token = localStorage.getItem('tooldb-token')
    if (token) {
      // Verify token is still valid
      get('/auth/me')
        .then((data) => {
          setUser(data)
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('tooldb-token')
          setUser(null)
          setLoading(false)
        })
    } else {
      // Try to login without credentials (works when auth is disabled)
      post('/auth/login', {})
        .then((data) => {
          if (data?.token) {
            localStorage.setItem('tooldb-token', data.token)
            setUser(data.user)
          }
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    }
  }, [])

  async function signIn(username, password) {
    const data = await post('/auth/login', { username, password })
    if (data?.token) {
      localStorage.setItem('tooldb-token', data.token)
      setUser(data.user)
    }
    return data
  }

  async function signOut() {
    await post('/auth/logout', {}).catch(() => {})
    localStorage.removeItem('tooldb-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
