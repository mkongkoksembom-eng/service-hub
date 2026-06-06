import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BellOff, CheckCheck, ArrowRight } from "lucide-react"
import { notificationsApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TYPE_META = {
  booking_created:     { dot: "bg-blue-500",    label: "New Booking"    },
  booking_confirmed:   { dot: "bg-emerald-500", label: "Confirmed"      },
  booking_rejected:    { dot: "bg-red-500",     label: "Rejected"       },
  booking_cancelled:   { dot: "bg-red-500",     label: "Cancelled"      },
  booking_in_progress: { dot: "bg-zinc-500",    label: "In Progress"    },
  booking_completed:   { dot: "bg-emerald-500", label: "Completed"      },
  review_received:     { dot: "bg-amber-500",   label: "Review"         },
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [marking, setMarking]             = useState(false)

  const bookingsPath = user?.role === "provider" ? "/provider/bookings" : "/client/bookings"

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data.results || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await notificationsApi.markRead(id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAll = async () => {
    setMarking(true)
    try {
      await notificationsApi.markAllRead()
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
      toast.success("All notifications marked as read.")
    } finally { setMarking(false) }
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Notifications</h1>
          {unread > 0 && (
            <Badge variant="secondary">{unread} unread</Badge>
          )}
        </div>
        {unread > 0 && (
          <Button
            variant="outline" size="sm"
            onClick={markAll} disabled={marking}
            className="cursor-pointer gap-2 text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          : notifications.length === 0
          ? (
            <div className="text-center py-20 space-y-2">
              <BellOff className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          )
          : notifications.map(n => {
              const meta = TYPE_META[n.notification_type] || { dot: "bg-zinc-400", label: "" }
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer",
                    n.is_read
                      ? "bg-card border-border"
                      : "bg-secondary border-border shadow-sm"
                  )}
                >
                  {/* Colour dot */}
                  <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", meta.dot)} />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={cn(
                        "text-sm font-semibold leading-tight",
                        n.is_read ? "text-foreground" : "text-foreground"
                      )}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {meta.label && (
                          <span className="text-[10px] font-medium text-muted-foreground
                            border border-border px-1.5 py-0.5 rounded leading-none">
                            {meta.label}
                          </span>
                        )}
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>

                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {n.booking && (
                        <Link
                          to={bookingsPath}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground
                            hover:text-foreground transition-colors cursor-pointer"
                        >
                          View booking <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
