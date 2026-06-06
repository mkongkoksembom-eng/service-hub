import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"

export default function ProtectedRoute({ roles, redirectTo = "/login" }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return <Navigate to={redirectTo} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
