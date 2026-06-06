import { useEffect, useState } from "react"
import { jobsApi, servicesApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Ban, Users, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

const STATUS_COLORS = {
  open: "bg-emerald-100 text-emerald-800",
  taken: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-600",
}

const APP_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-600",
  withdrawn: "bg-slate-100 text-slate-600",
}

const TABS = ["all", "open", "taken", "cancelled", "expired"]

const EMPTY_FORM = {
  title: "", description: "", category_name: "", skills_required: "", duration_estimate: "",
  city: "", address: "", budget_min: "", budget_max: "", budget_type: "negotiable",
  deadline: "", urgency: "normal",
}

export default function ClientJobsPage() {
  const [jobs, setJobs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [cancelTarget, setCancelTarget] = useState(null)

  const [appsTarget, setAppsTarget] = useState(null)
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [acceptTarget, setAcceptTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await jobsApi.myJobs()
      setJobs(data.results || data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    servicesApi.categories().then(({ data: c }) => setCategories(c.results || c)).catch(() => {})
  }, [])

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target?.value ?? e }))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (job) => {
    setEditing(job)
    setForm({
      title: job.title, description: job.description,
      category_name: job.category_name || "", skills_required: job.skills_required || "",
      duration_estimate: job.duration_estimate || "",
      city: job.city || "", address: job.address || "",
      budget_min: job.budget_min ?? "", budget_max: job.budget_max ?? "", budget_type: job.budget_type,
      deadline: job.deadline || "", urgency: job.urgency,
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.title || !form.description || !form.city) {
      toast.error("Title, description and city are required."); return
    }
    setSubmitting(true)
    try {
      const payload = { ...form }
      ;["budget_min", "budget_max"].forEach(k => { if (payload[k] === "") payload[k] = null })
      ;["deadline"].forEach(k => { if (payload[k] === "") payload[k] = null })
      if (editing) {
        await jobsApi.update(editing.id, payload)
        toast.success("Job updated.")
      } else {
        await jobsApi.create(payload)
        toast.success("Job posted! Matching providers have been notified.")
      }
      setOpen(false); load()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Failed.")
    } finally { setSubmitting(false) }
  }

  const cancelJob = async () => {
    setSubmitting(true)
    try {
      await jobsApi.cancel(cancelTarget.id)
      toast.success("Job cancelled.")
      setCancelTarget(null); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not cancel job.")
    } finally { setSubmitting(false) }
  }

  const openApplications = async (job) => {
    setAppsTarget(job)
    setAppsLoading(true)
    try {
      const { data } = await jobsApi.applications(job.id)
      setApplications(data.results || data)
    } catch { toast.error("Could not load applications.") }
    finally { setAppsLoading(false) }
  }

  const acceptApplication = async () => {
    setSubmitting(true)
    try {
      await jobsApi.acceptApplication(appsTarget.id, acceptTarget.id)
      toast.success("Application accepted — booking created!")
      setAcceptTarget(null); setAppsTarget(null); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not accept application.")
    } finally { setSubmitting(false) }
  }

  const filtered = (tab) => tab === "all" ? jobs : jobs.filter(j => j.status === tab)

  const JobCard = ({ job }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{job.title}</p>
            <p className="text-xs text-muted-foreground">{job.city}{job.category_name ? ` · ${job.category_name}` : ""}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[job.status]}`}>
            {job.status}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>

        <div className="flex items-center gap-3 text-sm flex-wrap">
          {(job.budget_min || job.budget_max) ? (
            <span className="font-semibold text-primary">
              {job.budget_min && job.budget_max
                ? `${parseFloat(job.budget_min).toLocaleString()}–${parseFloat(job.budget_max).toLocaleString()} FCFA`
                : `${parseFloat(job.budget_min || job.budget_max).toLocaleString()} FCFA`}
            </span>
          ) : <span className="text-muted-foreground">Negotiable</span>}
          {job.deadline && <span className="text-muted-foreground">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>}
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="w-3 h-3" /> {job.applications?.length ?? job.application_count ?? 0} applicant{(job.applications?.length ?? job.application_count) === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1 cursor-pointer" onClick={() => openApplications(job)}>
            <Users className="w-3.5 h-3.5" /> Applications
          </Button>
          {job.status === "open" && (
            <>
              <Button size="sm" variant="outline" className="gap-1 cursor-pointer" onClick={() => openEdit(job)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-destructive cursor-pointer" onClick={() => setCancelTarget(job)}>
                <Ban className="w-3.5 h-3.5" /> Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">My Jobs</h1>
        <Button onClick={openCreate} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Post a Job</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          {TABS.map(t => (
            <TabsTrigger key={t} value={t} className="capitalize cursor-pointer">{t}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t} value={t} className="mt-4 space-y-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)
              : filtered(t).length === 0
              ? (
                <div className="text-center py-12 text-muted-foreground">
                  No {t === "all" ? "" : t} jobs.{" "}
                  {t === "all" && <button onClick={openCreate} className="text-cta hover:underline cursor-pointer">Post your first job.</button>}
                </div>
              )
              : filtered(t).map(job => <JobCard key={job.id} job={job} />)
            }
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Job" : "Post a New Job"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the details of your job post." : "Describe what you need — matching providers will be notified instantly."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input placeholder="e.g. Fix leaking kitchen sink" value={form.title} onChange={f("title")} />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea placeholder="Describe the job in detail…" rows={4} value={form.description} onChange={f("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category_name} onValueChange={f("category_name")}>
                  <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent className="max-h-72" position="item-aligned">
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name} className="cursor-pointer">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={f("urgency")}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="low" className="cursor-pointer">Low — flexible timing</SelectItem>
                    <SelectItem value="normal" className="cursor-pointer">Normal</SelectItem>
                    <SelectItem value="urgent" className="cursor-pointer">Urgent — ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Skills required</Label>
              <Input placeholder="e.g. Plumbing, soldering, own tools" value={form.skills_required} onChange={f("skills_required")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City *</Label>
                <Input placeholder="e.g. Yaounde" value={form.city} onChange={f("city")} />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input placeholder="Neighbourhood / address" value={form.address} onChange={f("address")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Budget min (FCFA)</Label>
                <Input type="number" placeholder="5000" value={form.budget_min} onChange={f("budget_min")} />
              </div>
              <div className="space-y-1">
                <Label>Budget max (FCFA)</Label>
                <Input type="number" placeholder="15000" value={form.budget_max} onChange={f("budget_max")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Budget type</Label>
                <Select value={form.budget_type} onValueChange={f("budget_type")}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="fixed" className="cursor-pointer">Fixed price</SelectItem>
                    <SelectItem value="negotiable" className="cursor-pointer">Negotiable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={f("deadline")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Estimated duration</Label>
              <Input placeholder="e.g. 2 hours, half a day" value={form.duration_estimate} onChange={f("duration_estimate")} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {editing ? "Save Changes" : "Post Job"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel <strong>{cancelTarget?.title}</strong>? Pending applicants will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="cursor-pointer">Keep Job</Button>
            <Button variant="destructive" onClick={cancelJob} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Applications dialog */}
      <Dialog open={!!appsTarget} onOpenChange={() => { setAppsTarget(null); setApplications([]) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applications — {appsTarget?.title}</DialogTitle>
            <DialogDescription>Review providers who applied for this job.</DialogDescription>
          </DialogHeader>
          {appsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : applications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{app.provider_username}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${APP_STATUS_COLORS[app.status]}`}>
                        {app.status}
                      </span>
                    </div>
                    {app.cover_message && <p className="text-sm text-muted-foreground">{app.cover_message}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {app.proposed_price && <span className="font-semibold text-primary text-sm">{parseFloat(app.proposed_price).toLocaleString()} FCFA</span>}
                      {app.availability_note && <span>Availability: {app.availability_note}</span>}
                    </div>
                    {app.status === "pending" && appsTarget?.status === "open" && (
                      <Button size="sm" className="gap-1 cursor-pointer" onClick={() => setAcceptTarget(app)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Create Booking
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accept confirmation */}
      <Dialog open={!!acceptTarget} onOpenChange={() => setAcceptTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Accept Application</DialogTitle>
            <DialogDescription>
              Accept <strong>{acceptTarget?.provider_username}</strong>'s application? This creates a booking and rejects all other applicants.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setAcceptTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={acceptApplication} disabled={submitting} className="cursor-pointer">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Accept & Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
