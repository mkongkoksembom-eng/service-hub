import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarCheck, Star, Bell, Search, ArrowRight } from "lucide-react"
import { bookingsApi, notificationsApi } from "@/api"
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

export default function ClientDashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      bookingsApi.myBookings(),
      notificationsApi.unreadCount(),
    ]).then(([{ data: b }, { data: n }]) => {
      setBookings(b.results || [])
      setUnread(n.unread_count)
    }).finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: "Total Bookings", value: bookings.length, icon: CalendarCheck, color: "text-blue-600" },
    { label: "Completed", value: bookings.filter(b => b.status === "completed").length, icon: Star, color: "text-emerald-600" },
    { label: "Unread Alerts", value: unread, icon: Bell, color: "text-amber-600" },
  ]

  const recent = bookings.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Welcome back, {user?.username}!</h1>
        <p className="text-muted-foreground text-sm">Here's what's happening with your bookings.</p>
      </div>

      {/* Quick action */}
      <Link to="/services">
        <Button className="gap-2 cursor-pointer">
          <Search className="w-4 h-4" /> Browse Services
        </Button>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "—" : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Bookings</CardTitle>
          <Link to="/client/bookings" className="text-sm text-cta hover:underline cursor-pointer flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            : recent.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">No bookings yet. <Link to="/services" className="text-cta hover:underline cursor-pointer">Browse services</Link></p>
            : recent.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{b.service_title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.scheduled_date).toLocaleDateString()}</p>
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
