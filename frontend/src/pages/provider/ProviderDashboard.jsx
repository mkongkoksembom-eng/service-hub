import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Briefcase, ClipboardList, ArrowRight, Plus } from "lucide-react"
import { servicesApi, bookingsApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-zinc-100 text-zinc-700",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-slate-100 text-slate-600",
}

export default function ProviderDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ services: [], bookings: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      servicesApi.myServices(),
      bookingsApi.providerBookings(),
    ]).then(([{ data: s }, { data: b }]) => {
      setData({
        services: s.results || [],
        bookings: b.results || [],
      })
    }).finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: "Active Services", value: data.services.filter(s => s.is_active).length, icon: Briefcase, color: "text-blue-600", to: "/provider/services" },
    { label: "Pending Bookings", value: data.bookings.filter(b => b.status === "pending").length, icon: ClipboardList, color: "text-amber-600", to: "/provider/bookings" },
  ]

  const recent = data.bookings.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Provider Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user?.username}</p>
        </div>
        <Link to="/provider/services">
          <Button className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Service</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, to }) => (
          <Link to={to} key={label} className="cursor-pointer group">
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-muted ${color} group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{loading ? "—" : value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Bookings</CardTitle>
          <Link to="/provider/bookings" className="text-sm text-cta hover:underline cursor-pointer flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            : recent.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">No bookings yet.</p>
            : recent.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{b.service_title}</p>
                  <p className="text-xs text-muted-foreground">by {b.client_username} · {new Date(b.scheduled_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[b.status]}`}>
                  {b.status.replace("_", " ")}
                </span>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  )
}
