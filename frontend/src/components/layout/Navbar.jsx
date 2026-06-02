import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, LogOut, User, LayoutDashboard, Menu, ChevronDown, Briefcase } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import ThemeToggle from "@/components/shared/ThemeToggle"

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => setDropdownOpen(false), [location.pathname])

  const handleLogout = () => {
    logout()
    toast.success("See you next time!")
    navigate("/")
  }

  const dashboardPath = user?.role === "provider"
    ? "/provider/dashboard"
    : user?.role === "admin"
    ? "/admin/dashboard"
    : "/client/dashboard"
  const notifPath = user?.role === "provider"
    ? "/provider/notifications"
    : user?.role === "admin"
    ? null
    : "/client/notifications"
  const initials = user?.username?.slice(0, 2).toUpperCase() || "U"

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 h-16">

        {/* Left: burger + logo */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button onClick={onMenuClick}
              className="lg:hidden cursor-pointer p-2 rounded-md hover:bg-secondary transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-background" />
            </div>
            <span className="hidden sm:block font-bold text-lg text-foreground tracking-tight">
              Service Hub
            </span>
          </Link>
        </div>

        {/* Center: nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { to: "/services", label: "Browse Services" },
            ...(!user ? [{ to: "/register", label: "Become a Provider" }] : []),
          ].map(({ to, label }) => (
            <Link key={to} to={to}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer
                ${location.pathname === to
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              {notifPath && (
                <Link to={notifPath}
                  className="p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer">
                  <Bell className="w-5 h-5 text-foreground" />
                </Link>
              )}

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md
                    hover:bg-secondary transition-colors cursor-pointer"
                >
                  <Avatar className="w-7 h-7 ring-1 ring-border">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-foreground max-w-24 truncate">
                    {user.username}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-48 bg-popover rounded-md border border-border shadow-lg overflow-hidden"
                    >
                      <div className="p-3 border-b border-border">
                        <p className="font-semibold text-sm text-foreground truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                      </div>
                      <div className="p-1">
                        {[
                          { to: dashboardPath, icon: LayoutDashboard, label: "Dashboard" },
                          { to: "/profile", icon: User, label: "Profile" },
                        ].map(({ to, icon: Icon, label }) => (
                          <Link key={to} to={to} onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm
                              text-foreground hover:bg-secondary transition-colors cursor-pointer">
                            <Icon className="w-4 h-4 text-muted-foreground" /> {label}
                          </Link>
                        ))}
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm
                            text-destructive hover:bg-destructive/8 transition-colors cursor-pointer">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="px-4 py-2 rounded-md text-sm font-medium text-foreground
                  hover:bg-secondary transition-colors cursor-pointer">
                  Sign In
                </button>
              </Link>
              <Link to="/register">
                <button className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold
                  cursor-pointer hover:opacity-85 transition-opacity">
                  Get Started
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
