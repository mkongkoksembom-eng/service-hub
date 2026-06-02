import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, User, Lock, Camera, X } from "lucide-react"
import PasswordInput from "@/components/shared/PasswordInput"
import { useAuth } from "@/context/AuthContext"
import { authApi } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  old_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine(d => d.new_password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
})

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export default function ProfilePage() {
  const { user, updateUser } = useAuth()

  const [savingProfile, setSavingProfile]     = useState(false)
  const [savingPassword, setSavingPassword]   = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [preview, setPreview]                 = useState(null)

  const fileInputRef = useRef(null)

  // Revoke blob URL when preview changes or on unmount
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name:  user?.last_name  || "",
      phone:      user?.phone      || "",
    },
  })

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) })

  /* ── Avatar handlers ───────────────────────────────── */
  const handleAvatarClick = () => {
    if (!uploadingAvatar) fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 5 MB.")
      e.target.value = ""
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.")
      e.target.value = ""
      return
    }

    // Show local preview immediately
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))

    setUploadingAvatar(true)
    try {
      const { data: updated } = await authApi.uploadAvatar(file)
      updateUser(updated)
      setPreview(null) // let user.avatar take over
      toast.success("Profile photo updated.")
    } catch {
      setPreview(null)
      toast.error("Failed to upload photo.")
    } finally {
      setUploadingAvatar(false)
      e.target.value = ""
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      const { data: updated } = await authApi.removeAvatar()
      updateUser(updated)
      setPreview(null)
      toast.success("Profile photo removed.")
    } catch {
      toast.error("Failed to remove photo.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  /* ── Profile / password handlers ───────────────────── */
  const saveProfile = async (data) => {
    setSavingProfile(true)
    try {
      const { data: updated } = await authApi.updateProfile(data)
      updateUser(updated)
      toast.success("Profile updated.")
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Update failed.")
    } finally { setSavingProfile(false) }
  }

  const savePassword = async (data) => {
    setSavingPassword(true)
    try {
      await authApi.changePassword({ old_password: data.old_password, new_password: data.new_password })
      toast.success("Password changed successfully.")
      passwordForm.reset()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Password change failed.")
    } finally { setSavingPassword(false) }
  }

  const initials    = user?.username?.slice(0, 2).toUpperCase() || "U"
  const avatarSrc   = preview || user?.avatar || undefined
  const hasAvatar   = !!(preview || user?.avatar)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-foreground tracking-tight">My Profile</h1>

      {/* ── Identity card ─────────────────────────── */}
      <Card>
        <CardContent className="p-6 flex items-center gap-5">

          {/* Clickable avatar */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              aria-label="Change profile photo"
              className="group relative cursor-pointer disabled:cursor-wait"
            >
              <Avatar className="w-20 h-20 ring-2 ring-border">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-foreground text-background text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Hover overlay */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full
                bg-black/50 opacity-0 group-hover:opacity-100 group-disabled:opacity-100
                transition-opacity duration-150">
                {uploadingAvatar
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />
                }
              </span>
            </button>

            {/* Remove button — sits at the top-right corner */}
            {hasAvatar && !uploadingAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                aria-label="Remove profile photo"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive
                  flex items-center justify-center shadow-sm cursor-pointer
                  hover:bg-destructive/80 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Info */}
          <div className="space-y-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{user?.username}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
            <p className="text-xs text-muted-foreground pt-1">
              Click the photo to upload · Max 5 MB · JPG, PNG, WebP
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Personal information ───────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" /> Personal Information
          </CardTitle>
          <CardDescription>Update your name and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input placeholder="John" {...profileForm.register("first_name")} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input placeholder="Doe" {...profileForm.register("last_name")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="+237 6XX XXX XXX" {...profileForm.register("phone")} />
            </div>
            <Button type="submit" disabled={savingProfile} className="cursor-pointer">
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Change password ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4" /> Change Password
          </CardTitle>
          <CardDescription>Keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4">
            <div className="space-y-1">
              <Label>Current Password</Label>
              <PasswordInput placeholder="••••••••" {...passwordForm.register("old_password")} />
              {passwordForm.formState.errors.old_password && (
                <p className="text-destructive text-xs">{passwordForm.formState.errors.old_password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>New Password</Label>
              <PasswordInput placeholder="••••••••" {...passwordForm.register("new_password")} />
              {passwordForm.formState.errors.new_password && (
                <p className="text-destructive text-xs">{passwordForm.formState.errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Confirm New Password</Label>
              <PasswordInput placeholder="••••••••" {...passwordForm.register("confirm")} />
              {passwordForm.formState.errors.confirm && (
                <p className="text-destructive text-xs">{passwordForm.formState.errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword} className="cursor-pointer">
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
