import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ChevronLeft, Star, MapPin, Briefcase, CalendarDays,
  CheckCircle, Package, Mail, Phone, Lock,
} from "lucide-react"
import { servicesApi, reviewsApi } from "@/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

/* ── Rating summary (reused pattern from ServiceDetailPage) ── */
function RatingSummary({ reviews }) {
  if (reviews.length === 0) return null
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const rows = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: (reviews.filter(r => r.rating === star).length / reviews.length) * 100,
  }))

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center p-5 bg-secondary rounded-lg border border-border">
      <div className="text-center shrink-0">
        <p className="text-5xl font-bold text-foreground tracking-tight">{avg.toFixed(1)}</p>
        <div className="flex gap-0.5 justify-center mt-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-4 h-4 ${
              i <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 w-full space-y-2">
        {rows.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-3 text-right shrink-0">{star}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground w-4 shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Service card ─────────────────────────────────────────── */
function ServiceCard({ service }) {
  return (
    <Link to={`/services/${service.id}`} className="group">
      <div className="rounded-lg border border-border bg-card overflow-hidden
        hover:shadow-md hover:border-foreground/20 transition-all duration-200">
        <div className="h-36 bg-secondary overflow-hidden">
          {service.image
            ? <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            : <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl font-bold text-muted-foreground/20">
                  {service.title[0]}
                </span>
              </div>
          }
        </div>
        <div className="p-4 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight text-foreground
              line-clamp-2 group-hover:text-foreground/80 transition-colors">
              {service.title}
            </h3>
            <Badge variant="secondary" className="shrink-0 text-xs capitalize">
              {service.price_type}
            </Badge>
          </div>
          {service.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />{service.location}
            </p>
          )}
          <p className="text-sm font-bold text-foreground">
            {parseFloat(service.price).toLocaleString()} FCFA
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {service.price_type}
            </span>
          </p>
        </div>
      </div>
    </Link>
  )
}

/* ── Review card ──────────────────────────────────────────── */
function ReviewCard({ review }) {
  const date = new Date(review.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })
  return (
    <div className="py-5 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
            {review.client_username?.slice(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div>
              <p className="font-semibold text-sm text-foreground leading-tight">
                {review.client_username}
              </p>
              {review.service_title && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  on <Link
                    to={`/services/${review.service}`}
                    className="hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    {review.service_title}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3.5 h-3.5 ${
                    i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
                  }`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Stat box ─────────────────────────────────────────────── */
function StatBox({ value, label, icon: Icon }) {
  return (
    <div className="flex-1 text-center p-4 rounded-lg border border-border bg-card">
      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────── */
export default function ProviderProfilePage() {
  const { id } = useParams()

  const [provider, setProvider] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      servicesApi.getProvider(id),
      servicesApi.list({ provider: id, is_active: true }),
      reviewsApi.providerReviews(id),
    ]).then(([{ data: p }, { data: s }, { data: r }]) => {
      setProvider(p)
      setServices(s.results || s)
      setReviews(r.results || r)
    }).finally(() => setLoading(false))
  }, [id])

  /* ── Loading skeleton ─────────────────────────── */
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-5 items-center">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-20 flex-1 rounded-lg" />
        <Skeleton className="h-20 flex-1 rounded-lg" />
        <Skeleton className="h-20 flex-1 rounded-lg" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  )

  if (!provider) return (
    <div className="text-center py-20 text-muted-foreground">Provider not found.</div>
  )

  const initials = provider.user?.username?.slice(0, 2).toUpperCase() || "?"
  const memberSince = new Date(provider.created_at).toLocaleDateString("en-GB", {
    month: "long", year: "numeric",
  })
  const avgRating = parseFloat(provider.average_rating || 0).toFixed(1)

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-8">

      {/* Back */}
      <Link to="/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground
          hover:text-foreground mb-6 cursor-pointer transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Services
      </Link>

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8
        pb-8 border-b border-border">
        <Avatar className="w-20 h-20 shrink-0">
          <AvatarFallback className="bg-foreground text-background text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {provider.user?.username}
            </h1>
            {provider.is_verified && (
              <Badge className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700
                dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle className="w-3 h-3" /> Verified
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {provider.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {provider.location}
              </span>
            )}
            {provider.years_of_experience > 0 && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                {provider.years_of_experience} yr{provider.years_of_experience !== 1 ? "s" : ""} experience
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────── */}
      <div className="flex gap-3 mb-8">
        <StatBox
          value={avgRating}
          label="Avg Rating"
          icon={Star}
        />
        <StatBox
          value={provider.total_reviews}
          label={`Review${provider.total_reviews !== 1 ? "s" : ""}`}
          icon={Star}
        />
        <StatBox
          value={services.length}
          label={`Service${services.length !== 1 ? "s" : ""}`}
          icon={Package}
        />
      </div>

      {/* ── Contact info (visible only when viewer has a confirmed booking) ── */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
        {provider.user?.email || provider.user?.phone ? (
          <div className="space-y-2">
            {provider.user?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <a href={`mailto:${provider.user.email}`} className="hover:text-foreground transition-colors">
                  {provider.user.email}
                </a>
              </div>
            )}
            {provider.user?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <a href={`tel:${provider.user.phone}`} className="hover:text-foreground transition-colors">
                  {provider.user.phone}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
            <Lock className="w-4 h-4 shrink-0" />
            Contact details are visible once you have a confirmed booking with this provider.
          </div>
        )}
      </div>

      {/* ── Bio ────────────────────────────────── */}
      {provider.bio && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-2">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{provider.bio}</p>
        </div>
      )}

      {/* ── Services ───────────────────────────── */}
      <div className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Services
          <span className="text-muted-foreground font-normal text-sm ml-2">
            ({services.length})
          </span>
        </h2>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No active services at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        )}
      </div>

      {/* ── Reviews ────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Reviews
          <span className="text-muted-foreground font-normal text-sm ml-2">
            ({reviews.length})
          </span>
        </h2>

        <RatingSummary reviews={reviews} />

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 mt-4">No reviews yet.</p>
        ) : (
          <div className="mt-4">
            {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
