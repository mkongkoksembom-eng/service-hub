import { useEffect, useState } from "react"
import { reviewsApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Star, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ClientReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await reviewsApi.myReviews()
      setReviews(data.results || data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openEdit = (r) => {
    setEditTarget(r)
    setRating(r.rating)
    setComment(r.comment)
  }

  const saveEdit = async () => {
    setSubmitting(true)
    try {
      await reviewsApi.update(editTarget.id, { rating, comment })
      toast.success("Review updated.")
      setEditTarget(null)
      load()
    } catch {
      toast.error("Failed to update review.")
    } finally { setSubmitting(false) }
  }

  const deleteReview = async (id) => {
    if (!confirm("Delete this review?")) return
    try {
      await reviewsApi.delete(id)
      toast.success("Review deleted.")
      load()
    } catch { toast.error("Could not delete review.") }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Reviews</h1>
        <p className="text-muted-foreground text-sm">Reviews you've left for completed services</p>
      </div>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          : reviews.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>You haven't left any reviews yet.</p>
              <p className="text-sm">Complete a booking and share your experience!</p>
            </div>
          )
          : reviews.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Service #{r.service}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">{r.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>

                {r.comment && (
                  <p className="text-sm text-secondary bg-muted rounded-md p-3">{r.comment}</p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="gap-1 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteReview(r.id)} className="text-destructive cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Review</DialogTitle></DialogHeader>
          <div className="flex gap-1 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} className="cursor-pointer">
                <Star className={`w-7 h-7 transition-colors ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Update your comment…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={saveEdit} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
