import { useEffect, useRef, useState } from "react"
import { bookingsApi, chatApi } from "@/api"
import BookingMap from "@/components/shared/BookingMap"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, MessageCircle, Send, MapPin } from "lucide-react"
import { toast } from "sonner"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-zinc-100 text-zinc-700",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-slate-100 text-slate-600",
}

const TABS = ["all", "pending", "confirmed", "in_progress", "completed"]

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(null)

  // Chat state
  const [chatBooking, setChatBooking] = useState(null)
  const [messages, setMessages]       = useState([])
  const [chatInput, setChatInput]     = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [sendingMsg, setSendingMsg]   = useState(false)
  const messagesEndRef                = useRef(null)
  const chatPollRef                   = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await bookingsApi.providerBookings()
      setBookings(data.results || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => () => clearInterval(chatPollRef.current), [])

  const updateStatus = async (id, status) => {
    setUpdating(`${id}-${status}`)
    try {
      await bookingsApi.updateStatus(id, { status })
      toast.success(`Booking ${status.replace("_", " ")}.`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.status?.[0] || "Action failed.")
    } finally { setUpdating(null) }
  }

  const openChat = async (booking) => {
    setChatBooking(booking)
    setChatLoading(true)
    try {
      const { data } = await chatApi.getMessages(booking.id)
      setMessages(data)
    } catch { toast.error("Could not load messages.") }
    finally { setChatLoading(false) }
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

  const filtered = (tab) => tab === "all" ? bookings : bookings.filter(b => b.status === tab)

  const BookingCard = ({ b }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{b.service?.title}</p>
            <p className="text-sm text-muted-foreground">Client: <strong>{b.client?.username}</strong> ({b.client?.email})</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[b.status]}`}>
            {b.status.replace("_", " ")}
          </span>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>Date: {new Date(b.scheduled_date).toLocaleDateString()}</p>
          {b.address && <p>Address: {b.address}</p>}
          {b.notes && <p>Notes: {b.notes}</p>}
          <p className="font-semibold text-primary">{parseFloat(b.total_price).toLocaleString()} FCFA</p>
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
                <BookingMap bookingId={b.id} myRole="provider" />
              </div>
            </details>
          )}

        <div className="flex flex-wrap gap-2">
          {b.status === "pending" && (<>
            <Button size="sm" className="cursor-pointer" onClick={() => updateStatus(b.id, "confirmed")}
              disabled={!!updating}>
              {updating === `${b.id}-confirmed` ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Confirm
            </Button>
            <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => updateStatus(b.id, "rejected")}
              disabled={!!updating}>
              Reject
            </Button>
          </>)}
          {b.status === "confirmed" && (
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => updateStatus(b.id, "in_progress")}
              disabled={!!updating}>
              Start Service
            </Button>
          )}
          {b.status === "in_progress" && (
            <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(b.id, "completed")}
              disabled={!!updating}>
              {updating === `${b.id}-completed` ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Mark Complete
            </Button>
          )}
          {b.status === "completed" && (
            <Button size="sm" variant="outline" className="cursor-pointer gap-1" onClick={() => openChat(b)}>
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Manage Bookings</h1>

      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap h-auto">
          {TABS.map(t => (
            <TabsTrigger key={t} value={t} className="capitalize cursor-pointer">{t.replace("_", " ")}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t} value={t} className="mt-4 space-y-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
              : filtered(t).length === 0
              ? <p className="text-center text-muted-foreground py-12">No {t === "all" ? "" : t.replace("_", " ")} bookings.</p>
              : filtered(t).map(b => <BookingCard key={b.id} b={b} />)
            }
          </TabsContent>
        ))}
      </Tabs>

      {/* Chat dialog */}
      <Dialog open={!!chatBooking} onOpenChange={closeChat}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-4 h-4" />
              Chat — {chatBooking?.service?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Client: {chatBooking?.client?.username}
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
