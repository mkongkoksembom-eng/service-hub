import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi } from "@/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("access_token")
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authApi.getProfile()
      setUser(data)
    } catch {
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem("access_token", data.access)
    localStorage.setItem("refresh_token", data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.clear()
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
