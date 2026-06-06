import { useEffect, useRef, useState } from "react"
import { bookingsApi, chatApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Send, MessageSquare, ArrowLeft, User,
  Paperclip, Mic, Square, ImageIcon, Film, FileText, Download, Camera, X,
} from "lucide-react"
import { toast } from "sonner"

const CHATTABLE = new Set(["confirmed", "in_progress", "completed"])

const STATUS_LABELS = {
  confirmed:   { label: "Confirmed",   cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", cls: "bg-zinc-100 text-zinc-700" },
  completed:   { label: "Completed",   cls: "bg-emerald-100 text-emerald-800" },
}

const fmtBytes = (n) => {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

function InitialsAvatar({ name, size = "md", online }) {
  const initials = name?.slice(0, 2).toUpperCase() || "?"
  return (
    <div className={cn("relative shrink-0", size === "sm" ? "w-7 h-7" : "w-9 h-9")}>
      <div className={cn(
        "rounded-full bg-foreground text-background font-semibold flex items-center justify-center w-full h-full",
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {initials}
      </div>
      {online !== undefined && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full border-2 border-card",
          size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5",
          online ? "bg-emerald-500" : "bg-zinc-400"
        )} />
      )}
    </div>
  )
}

function MsgContent({ msg, mine }) {
  switch (msg.msg_type) {
    case "image":
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={msg.file_url}
            alt={msg.file_name || "image"}
            className="max-w-[240px] max-h-[200px] rounded-xl object-cover"
          />
        </a>
      )
    case "video":
      return (
        <video
          src={msg.file_url}
          controls
          preload="metadata"
          className="max-w-[280px] rounded-xl"
        />
      )
    case "audio":
      return (
        <audio
          src={msg.file_url}
          controls
          className="w-full min-w-[200px] max-w-[280px]"
        />
      )
    case "file":
      return (
        <a
          href={msg.file_url}
          download={msg.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-1 py-0.5 rounded transition-colors",
            mine ? "hover:bg-white/10" : "hover:bg-foreground/5"
          )}
        >
          <FileText className="w-5 h-5 shrink-0 opacity-70" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[180px]">{msg.file_name || "file"}</p>
            {msg.file_size && <p className="text-xs opacity-60">{fmtBytes(msg.file_size)}</p>}
          </div>
          <Download className="w-4 h-4 shrink-0 opacity-50" />
        </a>
      )
    default:
      return <p className="break-words">{msg.content}</p>
  }
}

export default function ChatPage() {
  const { user } = useAuth()
  const isProvider = user?.role === "provider"

  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [active, setActive]         = useState(null)
  const [messages, setMessages]     = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [input, setInput]           = useState("")
  const [sending, setSending]       = useState(false)
  const [mobileView, setMobileView] = useState("list")
  const [presenceMap, setPresenceMap] = useState({})
  const [attachOpen, setAttachOpen]   = useState(false)
  const [recording, setRecording]     = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const pollRef          = useRef(null)
  const bottomRef        = useRef(null)
  const inputRef         = useRef(null)
  const activeRef        = useRef(null)
  const bookingsRef      = useRef([])
  const [cameraOpen, setCameraOpen] = useState(false)

  const fileInputRef  = useRef(null)
  const fileTypeRef   = useRef("image")
  const videoRef      = useRef(null)
  const streamRef     = useRef(null)
  const attachRef        = useRef(null)
  const mediaRecorderRef = useRef(null)  // { recorder, stream, chunks }
  const recordTimerRef   = useRef(null)

  const getOtherUserId = (b) => isProvider ? b.client?.id : b.service?.provider_user_id

  const fetchPresence = async (bkgs) => {
    const ids = [...new Set(bkgs.map(getOtherUserId).filter(Boolean))]
    if (!ids.length) return
    try {
      const { data } = await chatApi.presence(ids)
      setPresenceMap(Object.fromEntries(Object.entries(data).map(([k, v]) => [Number(k), v])))
    } catch { /* non-critical */ }
  }

  useEffect(() => { bookingsRef.current = bookings }, [bookings])

  // Load conversations
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = isProvider
          ? await bookingsApi.providerBookings()
          : await bookingsApi.myBookings()
        const all = data.results ?? data
        setBookings(all.filter(b => CHATTABLE.has(b.status)))
      } catch {
        toast.error("Could not load conversations.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isProvider])

  useEffect(() => {
    if (bookings.length) fetchPresence(bookings)
  }, [bookings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatApi.heartbeat().catch(() => {})
    const id = setInterval(() => {
      chatApi.heartbeat().catch(() => {})
      if (bookingsRef.current.length) fetchPresence(bookingsRef.current)
    }, 20000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close attach menu when clicking outside
  useEffect(() => {
    if (!attachOpen) return
    const handler = (e) => {
      if (attachRef.current && !attachRef.current.contains(e.target)) setAttachOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [attachOpen])

  // Cleanup poll + recording + camera on unmount
  useEffect(() => () => {
    clearInterval(pollRef.current)
    clearInterval(recordTimerRef.current)
    const { recorder, stream } = mediaRecorderRef.current || {}
    if (recorder?.state !== "inactive") {
      if (recorder) recorder.onstop = null
      recorder?.stop()
    }
    stream?.getTracks().forEach(t => t.stop())
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const loadMessages = async (booking, silent = false) => {
    if (!silent) setMsgLoading(true)
    try {
      const { data } = await chatApi.getMessages(booking.id)
      setMessages(data)
    } catch {
      if (!silent) toast.error("Could not load messages.")
    } finally {
      if (!silent) setMsgLoading(false)
    }
  }

  const openConversation = async (booking) => {
    clearInterval(pollRef.current)
    activeRef.current = booking
    setActive(booking)
    setMessages([])
    setInput("")
    setMobileView("chat")
    await loadMessages(booking)
    inputRef.current?.focus()
    const uid = getOtherUserId(booking)
    if (uid) {
      chatApi.presence([uid]).then(({ data }) =>
        setPresenceMap(prev => ({ ...prev, [uid]: data[String(uid)] ?? false }))
      ).catch(() => {})
    }
    pollRef.current = setInterval(
      () => activeRef.current && loadMessages(activeRef.current, true),
      4000
    )
  }

  const closeConversation = () => {
    clearInterval(pollRef.current)
    activeRef.current = null
    setActive(null)
    setMessages([])
    setMobileView("list")
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !active) return
    setSending(true)
    setInput("")
    try {
      const { data: msg } = await chatApi.sendMessage(active.id, text)
      setMessages(prev => [...prev, msg])
    } catch {
      toast.error("Failed to send message.")
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const sendFile = async (file, msgType) => {
    if (!active) return
    setSending(true)
    try {
      const { data: msg } = await chatApi.sendFile(active.id, file, msgType)
      setMessages(prev => [...prev, msg])
    } catch {
      toast.error("Failed to send file.")
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Attachment picker ──────────────────────────────────────────
  const pickFile = (accept, type) => {
    fileTypeRef.current = type
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
    setAttachOpen(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    sendFile(file, fileTypeRef.current)
  }

  // ── Camera capture ─────────────────────────────────────────────
  const openCamera = async () => {
    setAttachOpen(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      toast.error("Camera access denied.")
    }
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play()
    }
  }, [cameraOpen])

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })
      sendFile(file, "image")
      closeCamera()
    }, "image/jpeg", 0.92)
  }

  // ── Voice recording ────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const options = {}
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4"
      }
      const recorder = new MediaRecorder(stream, options)
      const chunks = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      mediaRecorderRef.current = { recorder, stream, chunks }
      recorder.start()
      setRecording(true)
      setRecordingTime(0)
      recordTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      toast.error("Microphone access denied.")
    }
  }

  const stopRecording = (send) => {
    const { recorder, stream, chunks } = mediaRecorderRef.current || {}
    clearInterval(recordTimerRef.current)
    setRecording(false)
    setRecordingTime(0)

    if (!recorder) return

    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      if (send && chunks.length > 0) {
        const ext = recorder.mimeType?.includes("mp4") ? "m4a" : "webm"
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" })
        const file = new File([blob], `voice-message.${ext}`, { type: blob.type })
        sendFile(file, "audio")
      }
      mediaRecorderRef.current = null
    }
    if (recorder.state !== "inactive") recorder.stop()
  }

  const otherName = (b) => isProvider ? b.client?.username : b.service?.provider_name

  return (
    <div className="h-[calc(100vh-3.5rem)] flex border border-border rounded-lg overflow-hidden bg-card">

      {/* ── Left: conversation list ───────────────────────────────────── */}
      <div className={cn(
        "w-full lg:w-80 lg:border-r border-border shrink-0 flex flex-col",
        mobileView === "chat" ? "hidden lg:flex" : "flex"
      )}>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Chats
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bookings.length} active conversation{bookings.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No active conversations yet.</p>
              <p className="text-xs text-muted-foreground">
                Chats are available for confirmed and in-progress bookings.
              </p>
            </div>
          ) : (
            bookings.map(b => {
              const badge = STATUS_LABELS[b.status]
              const isSelected = active?.id === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => openConversation(b)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50",
                    "hover:bg-secondary cursor-pointer",
                    isSelected && "bg-secondary border-l-2 border-l-foreground"
                  )}
                >
                  <InitialsAvatar name={otherName(b)} online={presenceMap[getOtherUserId(b)]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {b.service?.title ?? "Booking #" + b.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{otherName(b)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", badge?.cls)}>
                        {badge?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{b.scheduled_date}</span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: chat window ────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col relative",
        mobileView === "list" ? "hidden lg:flex" : "flex"
      )}>
        {/* Camera overlay */}
        {cameraOpen && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost" size="icon"
                onClick={closeCamera}
                className="text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm font-medium">Take Photo</span>
              <div className="w-10" />
            </div>
            <div className="flex-1 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-center items-center py-8">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white ring-4 ring-white/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              />
            </div>
          </div>
        )}
        {!active ? (
          <div className="hidden lg:flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a conversation</p>
            <p className="text-xs text-muted-foreground">
              Choose a booking from the list to start chatting.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                onClick={closeConversation}
                className="lg:hidden p-1 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <InitialsAvatar name={otherName(active)} online={presenceMap[getOtherUserId(active)]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {active.service?.title ?? "Booking #" + active.id}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{otherName(active)}</span>
                  <span>·</span>
                  <span>{STATUS_LABELS[active.status]?.label}</span>
                  {presenceMap[getOtherUserId(active)] !== undefined && (
                    <>
                      <span>·</span>
                      <span className={cn(
                        "font-medium",
                        presenceMap[getOtherUserId(active)] ? "text-emerald-600" : "text-zinc-400"
                      )}>
                        {presenceMap[getOtherUserId(active)] ? "Online" : "Offline"}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className="h-9 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <User className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const mine = msg.sender_id === user?.id
                  const isMedia = msg.msg_type && msg.msg_type !== "text"
                  return (
                    <div key={msg.id ?? i} className={cn("flex gap-2 items-end", mine ? "justify-end" : "justify-start")}>
                      {!mine && <InitialsAvatar name={msg.sender_username} size="sm" />}
                      <div className={cn(
                        "max-w-[70%] rounded-2xl text-sm",
                        isMedia ? "overflow-hidden" : "px-3 py-2",
                        mine
                          ? "bg-foreground text-background rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm",
                        isMedia && "bg-transparent shadow-none",
                      )}>
                        <div className={cn(isMedia && "bg-transparent")}>
                          <MsgContent msg={msg} mine={mine} />
                        </div>
                        <p className={cn(
                          "text-[10px] mt-1",
                          isMedia ? "text-muted-foreground px-1" : "",
                          mine && !isMedia ? "text-background/60 text-right" : "text-muted-foreground"
                        )}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t border-border bg-card">
              {recording ? (
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => stopRecording(false)}
                    className="shrink-0 text-destructive hover:text-destructive cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </Button>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-sm font-mono tabular-nums text-foreground">{fmtTime(recordingTime)}</span>
                    <span className="text-xs text-muted-foreground">Recording…</span>
                  </div>
                  <Button
                    size="icon"
                    onClick={() => stopRecording(true)}
                    className="shrink-0 bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  {/* Attachment button + menu */}
                  <div ref={attachRef} className="relative shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAttachOpen(v => !v)}
                      disabled={sending}
                      className="cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    {attachOpen && (
                      <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-20 min-w-[140px]">
                        <button
                          onClick={openCamera}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors cursor-pointer text-left"
                        >
                          <Camera className="w-4 h-4 text-emerald-500 shrink-0" />
                          Take Photo
                        </button>
                        <button
                          onClick={() => pickFile("image/*", "image")}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors cursor-pointer text-left"
                        >
                          <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                          Photo / Image
                        </button>
                        <button
                          onClick={() => pickFile("video/*", "video")}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors cursor-pointer text-left"
                        >
                          <Film className="w-4 h-4 text-purple-500 shrink-0" />
                          Video
                        </button>
                        <button
                          onClick={() => pickFile("*/*", "file")}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors cursor-pointer text-left"
                        >
                          <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                          File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Text input */}
                  <Input
                    ref={inputRef}
                    placeholder="Type a message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    className="flex-1"
                    disabled={sending}
                  />

                  {/* Send or Mic */}
                  {input.trim() ? (
                    <Button
                      onClick={send}
                      disabled={sending}
                      size="icon"
                      className="shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={startRecording}
                      disabled={sending}
                      size="icon"
                      variant="ghost"
                      className="shrink-0 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </>
        )}
      </div>

    </div>
  )
}
