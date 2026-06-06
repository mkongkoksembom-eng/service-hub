import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Search, Briefcase, Star, Users, Zap, Shield, ArrowRight,
  Wrench, Monitor, Heart, Camera, Truck, BookOpen, ChevronRight
} from "lucide-react"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { useAuth } from "@/context/AuthContext"
import { statsApi } from "@/api"

const CATEGORIES = [
  { icon: Wrench,   label: "Construction",  delay: 0    },
  { icon: Monitor,  label: "ICT & Digital", delay: 0.05 },
  { icon: Heart,    label: "Health & Care", delay: 0.1  },
  { icon: Camera,   label: "Events",        delay: 0.15 },
  { icon: Truck,    label: "Transport",     delay: 0.2  },
  { icon: BookOpen, label: "Education",     delay: 0.25 },
]

function CategoryCard({ icon: Icon, label, delay, to }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="cursor-pointer group"
    >
      <Link to={to}>
        <div className="rounded-lg p-5 text-center border border-border bg-card
          hover:border-foreground/20 hover:shadow-sm transition-all duration-200">
          <div className="w-11 h-11 rounded-md bg-foreground flex items-center justify-center mx-auto mb-3
            group-hover:opacity-80 transition-opacity">
            <Icon className="w-5 h-5 text-background" />
          </div>
          <p className="font-medium text-sm text-foreground">{label}</p>
        </div>
      </Link>
    </motion.div>
  )
}

function StatCard({ value, label, delay }) {
  const ref = useScrollReveal()
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="text-center"
    >
      <p className="text-4xl font-bold text-background mb-1 tracking-tight">{value}</p>
      <p className="text-sm text-background/60 font-medium">{label}</p>
    </motion.div>
  )
}

function FeatureCard({ icon: Icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-lg p-6 border border-border bg-card hover:shadow-sm transition-shadow duration-200"
    >
      <div className="w-10 h-10 rounded-md bg-foreground flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-background" />
      </div>
      <h3 className="text-base font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  )
}

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K+`
  return String(n)
}

export default function LandingPage() {
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const { user } = useAuth()
  const dashboardPath = user?.role === "provider" ? "/provider/dashboard" : "/client/dashboard"
  const browseTarget = user ? "/services" : "/register"

  const [stats, setStats] = useState(null)
  useEffect(() => {
    statsApi.public().then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!user) { navigate("/register"); return }
    navigate(`/services${search ? `?search=${encodeURIComponent(search)}` : ""}`)
  }

  return (
    <div className="overflow-hidden">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center bg-background">
        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center py-24">

          {/* Left — text */}
          <div className="space-y-8 z-10">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 border border-border px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground"
            >
              <Zap className="w-3.5 h-3.5" />
              Cameroonian Service Marketplace
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground"
            >
              Find the Perfect Pro<br />for Any Job
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base text-muted-foreground max-w-md leading-relaxed"
            >
              Connect with skilled professionals across Cameroon. Book services,
              track jobs, and pay securely — all in one place.
            </motion.p>

            {/* Search bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex gap-2 max-w-lg"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="What service do you need?"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-md border border-border bg-background
                    text-foreground placeholder:text-muted-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/40
                    transition-colors"
                />
              </div>
              <button type="submit"
                className="px-5 py-3 rounded-md bg-foreground text-background text-sm font-semibold
                  cursor-pointer hover:opacity-85 transition-opacity whitespace-nowrap">
                Search
              </button>
            </motion.form>

            {/* Popular searches — sourced from most-listed service categories */}
            {stats?.popular_jobs?.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-2 items-center"
              >
                <span className="text-xs text-muted-foreground">Popular:</span>
                {stats.popular_jobs.map(tag => (
                  <button
                    key={tag}
                    onClick={() => user ? navigate(`/services?search=${encodeURIComponent(tag)}`) : navigate("/register")}
                    className="text-xs px-3 py-1.5 rounded-full border border-border
                      text-muted-foreground hover:border-foreground/30 hover:text-foreground
                      cursor-pointer transition-colors duration-150"
                  >
                    {tag}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right — stat grid */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:grid grid-cols-2 gap-4"
          >
            {[
              { value: stats ? fmt(stats.total_providers)        : "—", label: "Skilled Providers", icon: Users     },
              { value: stats ? fmt(stats.total_clients)          : "—", label: "Happy Clients",    icon: Star      },
              { value: stats ? `${stats.average_rating}★`        : "—", label: "Average Rating",   icon: Star      },
              { value: stats ? String(stats.total_categories)    : "—", label: "Categories",       icon: Briefcase },
            ].map(({ value, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="border border-border rounded-lg p-5 bg-card"
              >
                <Icon className="w-5 h-5 text-muted-foreground mb-3" />
                <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30"
        >
          <div className="w-px h-8 bg-foreground" />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────── */}
      <section className="py-16 bg-foreground">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: stats ? fmt(stats.total_clients)          : "—", label: "Happy Clients",     delay: 0    },
              { value: stats ? fmt(stats.total_providers)        : "—", label: "Skilled Providers", delay: 0.08 },
              { value: stats ? String(stats.total_categories)    : "—", label: "Categories",        delay: 0.16 },
              { value: stats ? `${stats.average_rating}★`        : "—", label: "Average Rating",    delay: 0.24 },
            ].map((s, i) => <StatCard key={i} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Browse by Category</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Find Work in Any Field
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              From construction to tech, beauty to business — every skill covered.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(cat => <CategoryCard key={cat.label} {...cat} to={browseTarget} />)}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10"
          >
            <Link to={browseTarget}>
              <button className="inline-flex items-center gap-2 border border-border px-6 py-2.5 rounded-md
                text-sm font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer">
                Explore All 14 Categories <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Hire a Pro in 3 Simple Steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-border" />

            {[
              { step: "01", title: "Search",  desc: "Browse 2,400+ verified providers across 113 service types.",         delay: 0    },
              { step: "02", title: "Book",    desc: "Choose your date, describe your needs, and send a booking request.", delay: 0.1  },
              { step: "03", title: "Done",    desc: "Provider arrives, completes the job, and you pay securely.",         delay: 0.2  },
            ].map(({ step, title, desc, delay }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-md bg-foreground flex items-center justify-center mb-5">
                  <span className="text-background font-bold text-base">{step}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Everything You Need
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard delay={0}    icon={Shield} title="Verified Providers"
              desc="Every provider is reviewed and rated by real clients. Trust is built in." />
            <FeatureCard delay={0.08} icon={Zap}    title="Instant Booking"
              desc="Book a service in minutes. No back-and-forth calls — just pick a date and confirm." />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────── */}
      <section className="py-24 bg-foreground">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-background mb-4 tracking-tight">
              Are You a Professional?
            </h2>
            <p className="text-background/60 text-base mb-10 max-w-xl mx-auto">
              Join providers already earning on Service Hub.
              Create your profile, list your services, and get hired.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <button className="px-8 py-3 rounded-md bg-background text-foreground font-semibold text-sm
                  shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
                  Become a Provider
                </button>
              </Link>
              <Link to={browseTarget}>
                <button className="px-8 py-3 rounded-md border border-background/25 text-background font-medium text-sm
                  cursor-pointer hover:bg-background/8 transition-colors">
                  Browse Services <ChevronRight className="inline w-4 h-4" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="py-10 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">Service Hub</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © 2026 Service Hub. Connecting Cameroon's workforce.
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link to={browseTarget} className="hover:text-foreground cursor-pointer transition-colors">Browse</Link>
            {user ? (
              <Link to={dashboardPath} className="hover:text-foreground cursor-pointer transition-colors">Dashboard</Link>
            ) : (
              <>
                <Link to="/login"    className="hover:text-foreground cursor-pointer transition-colors">Sign In</Link>
                <Link to="/register" className="hover:text-foreground cursor-pointer transition-colors">Register</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
