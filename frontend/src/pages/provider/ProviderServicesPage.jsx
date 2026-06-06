import { useEffect, useRef, useState } from "react"
import { servicesApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

export default function ProviderServicesPage() {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ title: "", description: "", price: "", price_type: "fixed", category_id: "", location: "" })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

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
    setImageFile(null)
    setImagePreview(null)
    setOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      title: s.title, description: s.description, price: s.price,
      price_type: s.price_type, category_id: String(s.category?.id || ""), location: s.location || "",
    })
    setImageFile(null)
    setImagePreview(s.image || null)
    setOpen(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const submit = async () => {
    if (!form.title || !form.price || !form.category_id) {
      toast.error("Title, price and category are required."); return
    }
    setSubmitting(true)
    try {
      let payload
      if (imageFile) {
        payload = new FormData()
        Object.entries(form).forEach(([k, v]) => { if (v !== "") payload.append(k, v) })
        payload.append("image", imageFile)
      } else {
        payload = { ...form }
        if (editing && imagePreview === null && editing.image) payload.image = ""
      }
      if (editing) {
        await servicesApi.update(editing.id, payload)
        toast.success("Service updated.")
      } else {
        await servicesApi.create(payload)
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
            <Card key={s.id} className="hover:shadow-md transition-shadow overflow-hidden">
              {s.image && (
                <div className="h-36 w-full overflow-hidden">
                  <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                </div>
              )}
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
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)} className="text-destructive cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

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
            <div className="space-y-1">
              <Label>Service Photo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs rounded px-2 py-1 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm">Click to upload a photo</span>
                  <span className="text-xs">JPG, PNG or WEBP · max 5 MB</span>
                </button>
              )}
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
