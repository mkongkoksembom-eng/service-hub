import { useEffect, useState } from "react"
import { statsApi } from "@/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users, Briefcase, CalendarCheck, DollarSign,
  Star, ShoppingBag, TrendingUp,
} from "lucide-react"

const STATUS_COLORS = {
  pending:     "bg-yellow-100 text-yellow-800",
  confirmed:   "bg-blue-100 text-blue-800",
  in_progress: "bg-zinc-100 text-zinc-700",
  completed:   "bg-emerald-100 text-emerald-800",
  cancelled:   "bg-red-100 text-red-800",
  rejected:    "bg-slate-100 text-slate-600",
}

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-secondary ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function BookingRow({ b }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-foreground">#{b.id}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[160px]">
        {b.service_title}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{b.client_username}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {new Date(b.scheduled_date).toLocaleDateString()}
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[b.status]}`}>
          {b.status.replace("_", " ")}
        </span>
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-right">
        {parseFloat(b.total_price).toLocaleString()} FCFA
      </td>
    </tr>
  )
}

function UserRow({ u }) {
  const initials = u.username?.slice(0, 2).toUpperCase() || "?"
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={u.avatar || undefined} />
            <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">{u.username}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[180px]">{u.email}</td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className="capitalize text-xs">{u.role}</Badge>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground text-right">
        {new Date(u.date_joined || Date.now()).toLocaleDateString()}
      </td>
    </tr>
  )
}

export default function AdminDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    statsApi.adminDashboard()
      .then(({ data }) => setData(data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )

  if (error) return (
    <div className="text-center py-20 text-destructive">{error}</div>
  )

  const { stats, booking_by_status, recent_bookings, recent_users } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        <Badge variant="outline" className="text-xs">Live data</Badge>
      </div>

      {/* ── Stat cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users}        label="Clients"        value={stats.total_clients}                         color="text-blue-600" />
        <StatCard icon={Briefcase}    label="Providers"      value={stats.total_providers}                       color="text-violet-600" />
        <StatCard icon={ShoppingBag}  label="Active Services" value={stats.total_services}                      color="text-orange-500" />
        <StatCard icon={CalendarCheck} label="Bookings"      value={stats.total_bookings}                        color="text-emerald-600" />
        <StatCard icon={DollarSign}   label="Revenue (FCFA)" value={stats.total_revenue.toLocaleString()}        color="text-green-600" />
        <StatCard icon={Star}         label="Avg Rating"     value={`${stats.average_rating} / 5`}              color="text-amber-500" />
      </div>

      {/* ── Booking status breakdown ─────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Bookings by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {booking_by_status.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[status]}`}>
                  {status.replace("_", " ")}
                </span>
                <span className="text-sm font-bold text-foreground">{count}</span>
              </div>
            ))}
            {booking_by_status.length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent bookings + users ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent bookings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" /> Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent_bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Service</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Client</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_bookings.map(b => <BookingRow key={b.id} b={b} />)}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent_users.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6">No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">User</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Email</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground">Role</th>
                      <th className="py-2 px-4 text-xs font-semibold text-muted-foreground text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_users.map(u => <UserRow key={u.id} u={u} />)}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
