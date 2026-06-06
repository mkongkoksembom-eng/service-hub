import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi } from "@/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    // Non-sensitive hint: only call the API when a session might exist.
    // The actual auth is in the HttpOnly cookie, not this value.
    if (!localStorage.getItem("is_logged_in")) {
      setLoading(false)
      return
    }
    try {
      const { data } = await authApi.getProfile()
      setUser(data)
    } catch {
      localStorage.removeItem("is_logged_in")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem("is_logged_in", "1")
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* server-side cookie clear best-effort */ }
    localStorage.removeItem("is_logged_in")
    setUser(null)
  }

  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }))

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
