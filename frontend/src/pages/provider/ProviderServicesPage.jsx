import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { servicesApi, paymentsApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Smartphone, RefreshCw, CheckCircle2, Star } from "lucide-react"
import { toast } from "sonner"

export default function ProviderServicesPage() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Featured listing MoMo flow
  const STEP = { PHONE: "phone", WAITING: "waiting", SUCCESS: "success", FAILED: "failed" }
  const [featureTarget, setFeatureTarget] = useState(null)
  const [featuredPaymentId, setFeaturedPaymentId] = useState(null)
  const [featurePhone, setFeaturePhone] = useState("")
  const [featureStep, setFeatureStep] = useState(STEP.PHONE)
  const [featureSubmitting, setFeatureSubmitting] = useState(false)
  const featurePollRef = useRef(null)
  const [form, setForm] = useState({ title: "", description: "", price: "", price_type: "fixed", category_id: "", location: "" })

  const load = async () => {
    setLoading(true)
    try {
      const { data: s } = await servicesApi.myServices()
      setServices(s.results || s)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    servicesApi.categoriesGrouped().then(({ data: c }) => setCategories(c.results || c))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: "", description: "", price: "", price_type: "fixed", category_id: "", location: "" })
    setOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      title: s.title, description: s.description, price: s.price,
      price_type: s.price_type, category_id: String(s.category?.id || ""), location: s.location || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.title || !form.price || !form.category_id) {
      toast.error("Title, price and category are required."); return
    }
    setSubmitting(true)
    try {
      if (editing) {
        await servicesApi.update(editing.id, form)
        toast.success("Service updated.")
      } else {
        await servicesApi.create(form)
        toast.success("Service created.")
      }
      setOpen(false); load()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Failed.")
    } finally { setSubmitting(false) }
  }

  const toggle = async (s) => {
    try {
      await servicesApi.update(s.id, { is_active: !s.is_active })
      toast.success(`Service ${s.is_active ? "deactivated" : "activated"}.`)
      load()
    } catch { toast.error("Failed to update.") }
  }

  const del = async () => {
    try {
      await servicesApi.delete(deleteTarget.id)
      toast.success("Service deleted.")
      setDeleteTarget(null)
      load()
    } catch { toast.error("Could not delete.") }
  }

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target?.value ?? e }))

  const openFeature = (s) => {
    setFeatureTarget(s)
    setFeaturedPaymentId(null)
    setFeaturePhone(user?.phone || "")
    setFeatureStep(STEP.PHONE)
  }

  const closeFeature = () => {
    clearInterval(featurePollRef.current)
    setFeatureTarget(null)
    setFeaturedPaymentId(null)
    setFeaturePhone("")
    setFeatureStep(STEP.PHONE)
  }

  const sendFeatureMomo = async () => {
    if (!featurePhone.trim()) { toast.error("Enter your MTN MoMo number."); return }
    setFeatureSubmitting(true)
    try {
      let fpId = featuredPaymentId
      if (!fpId) {
        const { data: fp } = await paymentsApi.createFeatured(featureTarget.id)
        fpId = fp.id
        setFeaturedPaymentId(fpId)
      }
      await paymentsApi.featuredMomoRequest(fpId, featurePhone)
      setFeatureStep(STEP.WAITING)
      let attempts = 0
      featurePollRef.current = setInterval(async () => {
        attempts++
        try {
          const { data } = await paymentsApi.featuredMomoStatus(fpId)
          if (data.status === "SUCCESSFUL") {
            clearInterval(featurePollRef.current)
            setFeatureStep(STEP.SUCCESS)
            toast.success("Service is now featured for 7 days!")
            load()
          } else if (data.status === "FAILED") {
            clearInterval(featurePollRef.current)
            setFeatureStep(STEP.FAILED)
          } else if (attempts >= 24) {
            clearInterval(featurePollRef.current)
            toast.error("Payment timed out. Please try again.")
            setFeatureStep(STEP.PHONE)
          }
        } catch { /* keep polling */ }
      }, 5000)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send payment request.")
    } finally { setFeatureSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">My Services</h1>
        <Button onClick={openCreate} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> New Service</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)
          : services.length === 0
          ? <div className="col-span-full text-center py-16 text-muted-foreground">
              No services yet. <button onClick={openCreate} className="text-cta hover:underline cursor-pointer">Create your first one.</button>
            </div>
          : services.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-primary">{parseFloat(s.price).toLocaleString()} FCFA</span>
                  <span className="text-muted-foreground capitalize">/ {s.price_type}</span>
                  {s.category && <Badge variant="outline" className="text-xs">{s.category.name}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="gap-1 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(s)} className="cursor-pointer">
                    {s.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  {!s.is_featured && (
                    <Button size="sm" variant="outline" onClick={() => openFeature(s)} className="gap-1 cursor-pointer text-amber-600 border-amber-300 hover:bg-amber-50">
                      <Star className="w-3.5 h-3.5" /> Feature
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)} className="text-destructive cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Feature listing dialog */}
      <Dialog open={!!featureTarget} onOpenChange={closeFeature}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Feature This Service
            </DialogTitle>
            <DialogDescription>
              <strong>{featureTarget?.title}</strong> will appear at the top of search results for 7 days for <strong>2,000 FCFA</strong>.
            </DialogDescription>
          </DialogHeader>

          {featureStep === STEP.PHONE && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">MTN MoMo Phone Number</label>
                <input
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. 6XXXXXXXX"
                  value={featurePhone}
                  onChange={e => setFeaturePhone(e.target.value)}
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">Enter the number registered with MTN MoMo.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeFeature} className="cursor-pointer">Cancel</Button>
                <Button onClick={sendFeatureMomo} disabled={featureSubmitting}
                  className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white gap-2">
                  {featureSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                  Pay 2,000 FCFA
                </Button>
              </div>
            </div>
          )}

          {featureStep === STEP.WAITING && (
            <div className="text-center space-y-3 py-2">
              <div className="relative inline-block">
                <Smartphone className="w-14 h-14 text-amber-500" />
                <RefreshCw className="w-4 h-4 text-amber-600 absolute -bottom-1 -right-1 animate-spin" />
              </div>
              <p className="font-semibold text-primary">Check your phone!</p>
              <p className="text-sm text-muted-foreground">Approve the <strong>2,000 FCFA</strong> MoMo request on <strong>{featurePhone}</strong>.</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for confirmation…
              </p>
            </div>
          )}

          {featureStep === STEP.SUCCESS && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <p className="font-semibold text-emerald-700 text-lg">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">Your service is now featured for 7 days.</p>
              <Button onClick={closeFeature} className="cursor-pointer">Done</Button>
            </div>
          )}

          {featureStep === STEP.FAILED && (
            <div className="text-center space-y-3 py-2">
              <p className="font-semibold text-destructive">Payment Failed</p>
              <p className="text-sm text-muted-foreground">The payment was declined. Please try again.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={closeFeature} className="cursor-pointer">Cancel</Button>
                <Button onClick={() => setFeatureStep(STEP.PHONE)} className="cursor-pointer">Try Again</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={del} className="cursor-pointer">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Create New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input placeholder="e.g. Deep House Cleaning" value={form.title} onChange={f("title")} />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea placeholder="Describe your service…" rows={4} value={form.description} onChange={f("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price (FCFA) *</Label>
                <Input type="number" placeholder="5000" value={form.price} onChange={f("price")} />
              </div>
              <div className="space-y-1">
                <Label>Price Type</Label>
                <Select value={form.price_type} onValueChange={f("price_type")}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={f("category_id")}>
                <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Select your service type" /></SelectTrigger>
                <SelectContent className="max-h-72" position="item-aligned">
                  {categories.map(parent => (
                    <SelectGroup key={parent.id}>
                      <SelectLabel className="text-xs font-bold text-primary bg-muted/50 px-2 py-1.5">
                        {parent.name}
                      </SelectLabel>
                      {parent.subcategories.map(sub => (
                        <SelectItem key={sub.id} value={String(sub.id)} className="cursor-pointer pl-5">
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input placeholder="e.g. Yaounde, Douala" value={form.location} onChange={f("location")} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={submit} disabled={submitting} className="cursor-pointer">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create Service"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
