import { NavLink } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, CalendarCheck, Star, Bell,
  Briefcase, ClipboardList, User, X, ShieldCheck, MessageSquare,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const clientLinks = [
  { to: "/client/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/client/bookings",      icon: CalendarCheck,   label: "My Bookings" },
  { to: "/client/chats",         icon: MessageSquare,   label: "Chats" },
  { to: "/client/reviews",       icon: Star,            label: "My Reviews" },
  { to: "/client/notifications", icon: Bell,            label: "Notifications" },
]

const providerLinks = [
  { to: "/provider/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/provider/services",      icon: Briefcase,       label: "My Services" },
  { to: "/provider/bookings",      icon: ClipboardList,   label: "Bookings" },
  { to: "/provider/chats",         icon: MessageSquare,   label: "Chats" },
  { to: "/provider/notifications", icon: Bell,            label: "Notifications" },
]

const adminLinks = [
  { to: "/admin/dashboard", icon: ShieldCheck, label: "Dashboard" },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const links = user?.role === "admin"
    ? adminLinks
    : user?.role === "provider"
    ? providerLinks
    : clientLinks
  const initials = user?.username?.slice(0, 2).toUpperCase() || "U"

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-60 flex flex-col transition-transform duration-300",
        "bg-background border-r border-border",
        "lg:static lg:translate-x-0 lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile close */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border lg:hidden">
          <span className="font-semibold text-sm text-foreground">Menu</span>
          <button onClick={onClose} className="cursor-pointer p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 ring-1 ring-border">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-foreground text-background font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-background" : "text-muted-foreground")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="p-2 border-t border-border">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <User className={cn("w-4 h-4", isActive ? "text-background" : "text-muted-foreground")} />
                Profile
              </>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  )
}
