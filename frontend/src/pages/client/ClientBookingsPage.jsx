import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { bookingsApi, reviewsApi, paymentsApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Star, Loader2, CreditCard, CheckCircle2, Smartphone, RefreshCw, MessageCircle, Send, MapPin } from "lucide-react"
import { toast } from "sonner"
import { chatApi } from "@/api"
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

// MoMo payment steps
const STEP = { PHONE: "phone", WAITING: "waiting", SUCCESS: "success", FAILED: "failed" }

export default function ClientBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [paymentMap, setPaymentMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState("")

  // Review state
  const [reviewTarget, setReviewTarget] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")

  // MoMo payment state
  const [payTarget, setPayTarget] = useState(null)
  const [paymentId, setPaymentId] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [momoStep, setMomoStep] = useState(STEP.PHONE)
  const [, setPolling] = useState(false)
  const pollRef = useRef(null)

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
      const [{ data: b }, { data: p }] = await Promise.all([
        bookingsApi.myBookings(),
        paymentsApi.myPayments(),
      ])
      setBookings(b.results || [])
      const map = {}
      for (const payment of (p.results || [])) map[payment.booking] = payment
      setPaymentMap(map)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Cleanup polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), [])

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

  const openPayDialog = async (booking) => {
    setSubmitting(true)
    try {
      // Create payment record first to get the ID
      const { data: payment } = await paymentsApi.create({
        booking_id: booking.id,
        method: "mobile_money",
      })
      setPaymentId(payment.id)
      setPayTarget(booking)
      setPhoneNumber(user?.phone || "")
      setMomoStep(STEP.PHONE)
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Could not initiate payment.")
    } finally { setSubmitting(false) }
  }

  const sendMomoRequest = async () => {
    if (!phoneNumber.trim()) { toast.error("Enter your MTN MoMo phone number."); return }
    setSubmitting(true)
    try {
      await paymentsApi.momoRequest(paymentId, phoneNumber)
      setMomoStep(STEP.WAITING)
      setPolling(true)
      // Poll every 5 seconds for up to 2 minutes
      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        try {
          const { data } = await paymentsApi.momoStatus(paymentId)
          if (data.status === "SUCCESSFUL") {
            clearInterval(pollRef.current)
            setPolling(false)
            setMomoStep(STEP.SUCCESS)
            toast.success("Payment confirmed! Thank you.")
            load()
          } else if (data.status === "FAILED") {
            clearInterval(pollRef.current)
            setPolling(false)
            setMomoStep(STEP.FAILED)
          } else if (attempts >= 24) {
            // 24 × 5s = 2 min timeout
            clearInterval(pollRef.current)
            setPolling(false)
            toast.error("Payment timed out. Please try again.")
            setMomoStep(STEP.PHONE)
          }
        } catch { /* keep polling on network hiccups */ }
      }, 5000)
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send payment request."
      toast.error(msg)
    } finally { setSubmitting(false) }
  }

  const closePayDialog = () => {
    clearInterval(pollRef.current)
    setPolling(false)
    setPayTarget(null)
    setPaymentId(null)
    setMomoStep(STEP.PHONE)
  }

  const filtered = (tab) => tab === "all" ? bookings : bookings.filter(b => b.status === tab)

  const BookingCard = ({ b }) => {
    const payment = paymentMap[b.id]
    const isPaid = payment?.status === "paid"
    const isRefunded = payment?.status === "refunded"
    const canPay = ["confirmed", "completed"].includes(b.status) && !isPaid && !isRefunded

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

          {isPaid && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" /> Paid via MTN MoMo
            </div>
          )}
          {isRefunded && (
            <div className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 w-fit">
              Refunded
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {["pending", "confirmed"].includes(b.status) && (
              <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setCancelTarget(b)}>
                Cancel
              </Button>
            )}
            {canPay && (
              <Button
                size="sm"
                className="cursor-pointer gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => openPayDialog(b)}
                disabled={submitting}
              >
                <Smartphone className="w-3.5 h-3.5" /> Pay with MoMo
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

      {/* MTN MoMo payment dialog */}
      <Dialog open={!!payTarget} onOpenChange={closePayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-yellow-500" /> MTN MoMo Payment
            </DialogTitle>
            <DialogDescription>
              {payTarget?.service?.title} — <strong>{payTarget && parseFloat(payTarget.total_price).toLocaleString()} FCFA</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Step 1 — Enter phone number */}
          {momoStep === STEP.PHONE && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>MTN MoMo Phone Number</Label>
                <Input
                  placeholder="e.g. 6XXXXXXXX"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">Enter the number registered with MTN MoMo (without country code).</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closePayDialog} className="cursor-pointer">Cancel</Button>
                <Button
                  onClick={sendMomoRequest}
                  disabled={submitting}
                  className="cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                  Send Payment Request
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Waiting for approval */}
          {momoStep === STEP.WAITING && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Smartphone className="w-16 h-16 text-yellow-500" />
                  <RefreshCw className="w-5 h-5 text-yellow-600 absolute -bottom-1 -right-1 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-primary">Check your phone!</p>
                <p className="text-sm text-muted-foreground">
                  A payment request of <strong>{payTarget && parseFloat(payTarget.total_price).toLocaleString()} FCFA</strong> has been sent to <strong>{phoneNumber}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">Enter your MoMo PIN on your phone to confirm.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Waiting for confirmation…
              </div>
            </div>
          )}

          {/* Step 3a — Success */}
          {momoStep === STEP.SUCCESS && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-700 text-lg">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  {parseFloat(payTarget?.total_price || 0).toLocaleString()} FCFA paid via MTN MoMo.
                </p>
              </div>
              <Button onClick={closePayDialog} className="cursor-pointer">Done</Button>
            </div>
          )}

          {/* Step 3b — Failed */}
          {momoStep === STEP.FAILED && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-destructive text-lg">Payment Failed</p>
                <p className="text-sm text-muted-foreground">The payment was declined or cancelled. Please try again.</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={closePayDialog} className="cursor-pointer">Close</Button>
                <Button onClick={() => setMomoStep(STEP.PHONE)} className="cursor-pointer">Try Again</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
