import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { MapPin, Star, Clock, CheckCircle, Loader2, ChevronLeft, Pencil, Trash2 } from "lucide-react"
import { servicesApi, reviewsApi, bookingsApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

/* ── Star selector ──────────────────────────────── */
function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          <Star className={`w-7 h-7 transition-colors ${
            star <= (hovered || value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40 hover:text-amber-300"
          }`} />
        </button>
      ))}
    </div>
  )
}

/* ── Rating summary ─────────────────────────────── */
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
            <Star key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
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

/* ── Individual review card ─────────────────────── */
function ReviewCard({ review, isOwn, onEdit, onDelete }) {
  const date = new Date(review.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })
  const initials = review.client?.username?.slice(0, 2).toUpperCase() || "?"

  return (
    <div className="py-5 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">{review.client?.username}</p>
              {isOwn && (
                <span className="text-[10px] font-medium text-muted-foreground border border-border
                  px-1.5 py-0.5 rounded leading-none">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
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
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{review.comment}</p>
          )}

          {isOwn && (
            <div className="flex gap-4 mt-2.5">
              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-xs text-muted-foreground
                  hover:text-foreground transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-destructive
                  hover:text-destructive/80 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main page ──────────────────────────────────── */
export default function ServiceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [service, setService]             = useState(null)
  const [reviews, setReviews]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [eligibleBooking, setEligibleBooking] = useState(null)

  const [booking, setBooking]             = useState({ scheduled_date: "", address: "", notes: "" })
  const [submitting, setSubmitting]       = useState(false)

  const [reviewForm, setReviewForm]       = useState({ rating: 0, comment: "" })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [editingReview, setEditingReview] = useState(false)

  // The current user's existing review for this service (if any)
  const myReview = user ? reviews.find(r => r.client?.username === user.username) : null
  // Can write a new review: client, has a completed booking, hasn't reviewed yet
  const canReview = user?.role === "client" && eligibleBooking && !myReview

  /* ── Fetch service + reviews ─────────────────── */
  useEffect(() => {
    Promise.all([
      servicesApi.detail(id),
      reviewsApi.serviceReviews(id),
    ]).then(([{ data: svc }, { data: rev }]) => {
      setService(svc)
      setReviews(rev.results || rev)
    }).finally(() => setLoading(false))
  }, [id])

  /* ── Fetch eligible booking (client only) ────── */
  useEffect(() => {
    if (user?.role !== "client") return
    bookingsApi.myBookings({ status: "completed" }).then(({ data }) => {
      const completed = data.results || data
      // Find first completed booking for this service that hasn't been reviewed
      // (server will also validate — this is just for showing/hiding the form)
      const found = completed.find(b => {
        const svcId = b.service?.id ?? b.service
        return svcId === parseInt(id)
      })
      setEligibleBooking(found || null)
    }).catch(() => {})
  }, [id, user])

  /* ── Book service ────────────────────────────── */
  const handleBook = async (e) => {
    e.preventDefault()
    if (!user) { navigate("/login"); return }
    if (user.role !== "client") { toast.error("Only clients can book services."); return }
    setSubmitting(true)
    try {
      await bookingsApi.create({ service_id: parseInt(id), ...booking })
      toast.success("Booking request sent! The provider will confirm shortly.")
      navigate("/client/bookings")
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Booking failed.")
    } finally { setSubmitting(false) }
  }

  /* ── Submit / update review ──────────────────── */
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) { toast.error("Please select a star rating."); return }

    setReviewSubmitting(true)
    try {
      if (editingReview && myReview) {
        const { data } = await reviewsApi.update(myReview.id, {
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        })
        setReviews(prev => prev.map(r => r.id === data.id ? data : r))
        toast.success("Review updated.")
        setEditingReview(false)
      } else {
        const { data } = await reviewsApi.create({
          booking_id: eligibleBooking.id,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        })
        setReviews(prev => [data, ...prev])
        toast.success("Review submitted!")
      }
      setReviewForm({ rating: 0, comment: "" })
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Failed to submit review.")
    } finally { setReviewSubmitting(false) }
  }

  /* ── Delete review ───────────────────────────── */
  const handleDeleteReview = async () => {
    if (!myReview) return
    try {
      await reviewsApi.delete(myReview.id)
      setReviews(prev => prev.filter(r => r.id !== myReview.id))
      setReviewForm({ rating: 0, comment: "" })
      toast.success("Review deleted.")
    } catch {
      toast.error("Failed to delete review.")
    }
  }

  const startEdit = () => {
    setReviewForm({ rating: myReview.rating, comment: myReview.comment })
    setEditingReview(true)
  }

  const cancelEdit = () => {
    setReviewForm({ rating: 0, comment: "" })
    setEditingReview(false)
  }

  /* ── Loading ─────────────────────────────────── */
  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-8 space-y-6">
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
  if (!service) return (
    <div className="text-center py-20 text-muted-foreground">Service not found.</div>
  )

  const avgRating = parseFloat(service.provider?.average_rating || 0).toFixed(1)

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-8">
      <Link to="/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground
          hover:text-foreground mb-6 cursor-pointer transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Services
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Main column ──────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Image */}
          <div className="bg-muted rounded-xl overflow-hidden h-64">
            {service.image
              ? <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-6xl font-bold text-muted-foreground/20">
                    {service.title[0]}
                  </span>
                </div>
            }
          </div>

          {/* Title + meta */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {service.category && <Badge variant="secondary">{service.category.name}</Badge>}
              <Badge variant={service.is_active ? "default" : "destructive"}>
                {service.is_active ? "Available" : "Unavailable"}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{service.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />{service.location || "Remote"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />{service.price_type}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {avgRating} ({service.provider?.total_reviews} reviews)
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{service.description}</p>
          </div>

          {/* Provider card */}
          <Card>
            <CardHeader><CardTitle className="text-base">About the Provider</CardTitle></CardHeader>
            <CardContent className="flex items-start gap-4">
              <Link to={`/providers/${service.provider?.id}`} className="shrink-0">
                <Avatar className="w-12 h-12 ring-1 ring-border hover:ring-foreground/30 transition-all">
                  <AvatarFallback className="bg-foreground text-background font-semibold">
                    {service.provider?.user?.username?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="space-y-1 flex-1 min-w-0">
                <Link
                  to={`/providers/${service.provider?.id}`}
                  className="font-semibold text-foreground hover:underline cursor-pointer"
                >
                  {service.provider?.user?.username}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {avgRating} · {service.provider?.total_reviews} reviews
                  {service.provider?.is_verified && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                {service.provider?.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{service.provider.bio}</p>
                )}
                <Link
                  to={`/providers/${service.provider?.id}`}
                  className="inline-block text-xs text-muted-foreground hover:text-foreground
                    transition-colors mt-1 cursor-pointer"
                >
                  View full profile →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* ══ REVIEWS SECTION ═══════════════════ */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Reviews
              <span className="text-muted-foreground font-normal text-base ml-2">
                ({reviews.length})
              </span>
            </h2>

            {/* Rating summary */}
            <RatingSummary reviews={reviews} />

            {/* Write a review — only if eligible and not editing */}
            {(canReview || (editingReview && myReview)) && (
              <div className="border border-border rounded-lg p-5 space-y-4 bg-card">
                <h3 className="font-semibold text-sm text-foreground">
                  {editingReview ? "Edit your review" : "Share your experience"}
                </h3>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Rating</Label>
                    <StarSelector
                      value={reviewForm.rating}
                      onChange={r => setReviewForm(f => ({ ...f, rating: r }))}
                    />
                    {reviewForm.rating > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {["", "Poor", "Fair", "Good", "Very good", "Excellent"][reviewForm.rating]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="review-comment" className="text-sm font-medium">
                      Comment <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="review-comment"
                      placeholder="Describe your experience with this service..."
                      rows={3}
                      value={reviewForm.comment}
                      onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={reviewSubmitting} className="cursor-pointer">
                      {reviewSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {editingReview ? "Update Review" : "Submit Review"}
                    </Button>
                    {editingReview && (
                      <Button type="button" variant="outline" onClick={cancelEdit} className="cursor-pointer">
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No reviews yet. {canReview ? "Be the first to leave one!" : ""}
              </p>
            ) : (
              <div>
                {reviews.map(r => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isOwn={r.client?.username === user?.username}
                    onEdit={startEdit}
                    onDelete={handleDeleteReview}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Booking sidebar ───────────────────── */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <p className="text-2xl font-bold text-foreground">
                {parseFloat(service.price).toLocaleString()} FCFA
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {service.price_type}
                </span>
              </p>
            </CardHeader>
            <CardContent>
              {user?.role === "client" && service.is_active ? (
                <form onSubmit={handleBook} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Scheduled Date</Label>
                    <Input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={booking.scheduled_date}
                      onChange={e => setBooking(b => ({ ...b, scheduled_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input
                      placeholder="Where should the service be performed?"
                      value={booking.address}
                      onChange={e => setBooking(b => ({ ...b, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any special instructions?"
                      rows={3}
                      value={booking.notes}
                      onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Request Booking
                  </Button>
                </form>
              ) : !user ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">Sign in to book this service</p>
                  <Link to="/login">
                    <Button className="w-full cursor-pointer">Sign In to Book</Button>
                  </Link>
                </div>
              ) : user.role === "provider" ? (
                <p className="text-sm text-muted-foreground text-center">
                  Providers cannot book services.
                </p>
              ) : (
                <p className="text-sm text-destructive text-center">
                  This service is currently unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
