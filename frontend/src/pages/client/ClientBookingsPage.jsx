import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { bookingsApi, reviewsApi, chatApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Star, Loader2, MessageCircle, Send, MapPin } from "lucide-react"
import { toast } from "sonner"
import BookingMap from "@/components/shared/BookingMap"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-zinc-100 text-zinc-700",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-slate-100 text-slate-600",
}

const TABS = ["all", "pending", "confirmed", "completed", "cancelled"]

export default function ClientBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState("")

  // Review state
  const [reviewTarget, setReviewTarget] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")

  const [submitting, setSubmitting] = useState(false)

  // Chat state
  const [chatBooking, setChatBooking]   = useState(null)
  const [messages, setMessages]         = useState([])
  const [chatInput, setChatInput]       = useState("")
  const [chatLoading, setChatLoading]   = useState(false)
  const [sendingMsg, setSendingMsg]     = useState(false)
  const messagesEndRef                  = useRef(null)
  const chatPollRef                     = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data: b } = await bookingsApi.myBookings()
      setBookings(b.results || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Chat helpers
  const openChat = async (booking) => {
    setChatBooking(booking)
    setChatLoading(true)
    try {
      const { data } = await chatApi.getMessages(booking.id)
      setMessages(data)
    } catch { toast.error("Could not load messages.") }
    finally { setChatLoading(false) }
    // Poll for new messages every 4 seconds while dialog is open
    chatPollRef.current = setInterval(async () => {
      try {
        const { data } = await chatApi.getMessages(booking.id)
        setMessages(data)
      } catch { /* silent */ }
    }, 4000)
  }

  const closeChat = () => {
    clearInterval(chatPollRef.current)
    setChatBooking(null)
    setMessages([])
    setChatInput("")
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    setSendingMsg(true)
    try {
      const { data: msg } = await chatApi.sendMessage(chatBooking.id, chatInput.trim())
      setMessages(prev => [...prev, msg])
      setChatInput("")
    } catch { toast.error("Failed to send message.") }
    finally { setSendingMsg(false) }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => () => clearInterval(chatPollRef.current), [])

  const cancel = async () => {
    if (!cancelReason.trim()) { toast.error("Please provide a cancellation reason."); return }
    setSubmitting(true)
    try {
      await bookingsApi.updateStatus(cancelTarget.id, { status: "cancelled", cancellation_reason: cancelReason })
      toast.success("Booking cancelled.")
      setCancelTarget(null); setCancelReason(""); load()
    } catch (err) {
      toast.error(err.response?.data?.status?.[0] || "Failed to cancel.")
    } finally { setSubmitting(false) }
  }

  const submitReview = async () => {
    setSubmitting(true)
    try {
      await reviewsApi.create({ booking_id: reviewTarget.id, rating, comment })
      toast.success("Review submitted!")
      setReviewTarget(null); setRating(5); setComment(""); load()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Failed to submit review.")
    } finally { setSubmitting(false) }
  }

  const filtered = (tab) => tab === "all" ? bookings : bookings.filter(b => b.status === tab)

  const BookingCard = ({ b }) => {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{b.service?.title}</p>
              <p className="text-xs text-muted-foreground">by {b.service?.provider_name}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[b.status]}`}>
              {b.status.replace("_", " ")}
            </span>
          </div>

          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Date: {new Date(b.scheduled_date).toLocaleDateString()}</p>
            {b.address && <p>Address: {b.address}</p>}
            <p className="font-semibold text-primary text-base">
              {parseFloat(b.total_price).toLocaleString()} FCFA
            </p>
          </div>

          {/* Live location map — confirmed & in_progress only */}
          {["confirmed", "in_progress"].includes(b.status) && (
            <details className="group">
              <summary className="flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer select-none list-none py-1">
                <MapPin className="w-3.5 h-3.5" />
                Live Location
                <span className="text-muted-foreground font-normal ml-1 group-open:hidden">(click to expand)</span>
              </summary>
              <div className="mt-2">
                <BookingMap bookingId={b.id} myRole="client" />
              </div>
            </details>
          )}

          <div className="flex gap-2 flex-wrap">
            {["pending", "confirmed"].includes(b.status) && (
              <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setCancelTarget(b)}>
                Cancel
              </Button>
            )}
            {b.status === "completed" && !b.has_review && (
              <Button size="sm" variant="outline" className="cursor-pointer gap-1" onClick={() => setReviewTarget(b)}>
                <Star className="w-3.5 h-3.5" /> Leave Review
              </Button>
            )}
            {b.status === "completed" && (
              <Button size="sm" variant="outline" className="cursor-pointer gap-1" onClick={() => openChat(b)}>
                <MessageCircle className="w-3.5 h-3.5" /> Chat
              </Button>
            )}
          </div>

          {b.cancellation_reason && (
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">Reason: {b.cancellation_reason}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">My Bookings</h1>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          {TABS.map(t => (
            <TabsTrigger key={t} value={t} className="capitalize cursor-pointer">{t}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t} value={t} className="mt-4 space-y-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
              : filtered(t).length === 0
              ? <p className="text-center text-muted-foreground py-12">No {t === "all" ? "" : t} bookings.</p>
              : filtered(t).map(b => <BookingCard key={b.id} b={b} />)
            }
          </TabsContent>
        ))}
      </Tabs>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => { setCancelTarget(null); setCancelReason("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>Provide a reason for cancelling <strong>{cancelTarget?.service?.title}</strong>.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Cancellation reason…" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="cursor-pointer">Keep Booking</Button>
            <Button variant="destructive" onClick={cancel} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => { setReviewTarget(null); setRating(5); setComment("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>How was <strong>{reviewTarget?.service?.title}</strong>?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} className="cursor-pointer">
                <Star className={`w-7 h-7 transition-colors ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Tell us about your experience (optional)…" value={comment} onChange={e => setComment(e.target.value)} rows={4} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setReviewTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submitReview} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat dialog */}
      <Dialog open={!!chatBooking} onOpenChange={closeChat}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-4 h-4" />
              Chat — {chatBooking?.service?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provider: {chatBooking?.service?.provider_name}
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No messages yet. Say hello!
              </p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    msg.is_mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {!msg.is_mine && (
                      <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.sender_username}</p>
                    )}
                    <p className="leading-snug">{msg.content}</p>
                    <p className={`text-xs mt-1 opacity-60 ${msg.is_mine ? "text-right" : ""}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border shrink-0 flex gap-2">
            <input
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Type a message…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            />
            <Button size="icon" onClick={sendMessage} disabled={sendingMsg || !chatInput.trim()} className="rounded-full shrink-0 cursor-pointer">
              {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
