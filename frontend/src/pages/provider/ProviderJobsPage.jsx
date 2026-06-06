import { useEffect, useState } from "react"
import { jobsApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Send, MapPin, Clock, Wallet, X } from "lucide-react"
import { toast } from "sonner"

const URGENCY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-800",
  urgent: "bg-red-100 text-red-800",
}

const APP_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-600",
  withdrawn: "bg-slate-100 text-slate-600",
}

const budgetLabel = (job) => {
  if (job.budget_min && job.budget_max) return `${parseFloat(job.budget_min).toLocaleString()}–${parseFloat(job.budget_max).toLocaleString()} FCFA`
  if (job.budget_min || job.budget_max) return `${parseFloat(job.budget_min || job.budget_max).toLocaleString()} FCFA`
  return "Negotiable"
}

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState([])
  const [applied, setApplied] = useState([])
  const [loading, setLoading] = useState(true)
  const [appliedLoading, setAppliedLoading] = useState(true)

  const [applyTarget, setApplyTarget] = useState(null)
  const [coverMessage, setCoverMessage] = useState("")
  const [proposedPrice, setProposedPrice] = useState("")
  const [availabilityNote, setAvailabilityNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [withdrawTarget, setWithdrawTarget] = useState(null)

  const appliedJobIds = new Set(applied.map(j => j.id))

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await jobsApi.list()
      setJobs(data.results || data)
    } finally { setLoading(false) }
  }

  const loadApplied = async () => {
    setAppliedLoading(true)
    try {
      const { data } = await jobsApi.appliedJobs()
      setApplied(data.results || data)
    } finally { setAppliedLoading(false) }
  }

  useEffect(() => { load(); loadApplied() }, [])

  const openApply = (job) => {
    setApplyTarget(job)
    setCoverMessage(""); setProposedPrice(""); setAvailabilityNote("")
  }

  const submitApplication = async () => {
    setSubmitting(true)
    try {
      const payload = { cover_message: coverMessage }
      if (proposedPrice) payload.proposed_price = proposedPrice
      if (availabilityNote) payload.availability_note = availabilityNote
      await jobsApi.apply(applyTarget.id, payload)
      toast.success("Application submitted!")
      setApplyTarget(null)
      loadApplied()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Failed to apply.")
    } finally { setSubmitting(false) }
  }

  const withdraw = async () => {
    setSubmitting(true)
    try {
      await jobsApi.withdrawApplication(withdrawTarget.id, withdrawTarget.my_application.id)
      toast.success("Application withdrawn.")
      setWithdrawTarget(null)
      loadApplied()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not withdraw.")
    } finally { setSubmitting(false) }
  }

  const JobCard = ({ job }) => {
    const alreadyApplied = appliedJobIds.has(job.id)
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.city}{job.category_name ? ` · ${job.category_name}` : ""}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${URGENCY_COLORS[job.urgency]}`}>
              {job.urgency.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm flex-wrap text-muted-foreground">
            <span className="font-semibold text-primary flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> {budgetLabel(job)}
            </span>
            {job.deadline && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due {new Date(job.deadline).toLocaleDateString()}</span>
            )}
            {job.duration_estimate && <span>~{job.duration_estimate}</span>}
          </div>

          <div>
            {alreadyApplied ? (
              <Badge variant="secondary">Already applied</Badge>
            ) : (
              <Button size="sm" className="gap-1 cursor-pointer" onClick={() => openApply(job)}>
                <Send className="w-3.5 h-3.5" /> Apply Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const AppliedCard = ({ job }) => {
    const app = job.my_application
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.city}{job.category_name ? ` · ${job.category_name}` : ""}
              </p>
            </div>
            {app && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${APP_STATUS_COLORS[app.status]}`}>
                {app.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap text-muted-foreground">
            <span className="font-semibold text-primary flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> {budgetLabel(job)}
            </span>
            {app?.proposed_price && <span>Your offer: {parseFloat(app.proposed_price).toLocaleString()} FCFA</span>}
          </div>
          {app?.status === "pending" && (
            <Button size="sm" variant="ghost" className="gap-1 text-destructive cursor-pointer" onClick={() => setWithdrawTarget(job)}>
              <X className="w-3.5 h-3.5" /> Withdraw Application
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Jobs</h1>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse" className="cursor-pointer">Browse Jobs</TabsTrigger>
          <TabsTrigger value="applied" className="cursor-pointer">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4 space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
            : jobs.length === 0
            ? <p className="text-center text-muted-foreground py-12">No open jobs right now. Check back soon!</p>
            : jobs.map(job => <JobCard key={job.id} job={job} />)
          }
        </TabsContent>

        <TabsContent value="applied" className="mt-4 space-y-4">
          {appliedLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
            : applied.length === 0
            ? <p className="text-center text-muted-foreground py-12">You haven't applied to any jobs yet.</p>
            : applied.map(job => <AppliedCard key={job.id} job={job} />)
          }
        </TabsContent>
      </Tabs>

      {/* Apply dialog */}
      <Dialog open={!!applyTarget} onOpenChange={() => setApplyTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for "{applyTarget?.title}"</DialogTitle>
            <DialogDescription>Tell the client why you're a great fit for this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Cover message</Label>
              <Textarea placeholder="Introduce yourself and explain your approach…" rows={4} value={coverMessage} onChange={e => setCoverMessage(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Your price (FCFA)</Label>
                <Input type="number" placeholder="e.g. 10000" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Availability</Label>
                <Input placeholder="e.g. Available this weekend" value={availabilityNote} onChange={e => setAvailabilityNote(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setApplyTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submitApplication} disabled={submitting} className="gap-1 cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation */}
      <Dialog open={!!withdrawTarget} onOpenChange={() => setWithdrawTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Withdraw Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw your application for <strong>{withdrawTarget?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setWithdrawTarget(null)} className="cursor-pointer">Keep Application</Button>
            <Button variant="destructive" onClick={withdraw} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
