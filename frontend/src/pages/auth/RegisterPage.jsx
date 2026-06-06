import React, { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Briefcase, User, Mail, Lock, ShieldCheck } from "lucide-react"
import { authApi, servicesApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import ThemeToggle from "@/components/shared/ThemeToggle"
import PasswordInput from "@/components/shared/PasswordInput"
import PhoneInput from "@/components/shared/PhoneInput"

const schema = z.object({
  email: z.email("Enter a valid email"),
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
  password2: z.string(),
  role: z.enum(["client", "provider"]),
  phone: z.string().optional(),
}).refine((d) => d.password === d.password2, {
  message: "Passwords do not match",
  path: ["password2"],
})

const PRICE_TYPES = [
  { value: "fixed",  label: "Fixed price" },
  { value: "hourly", label: "Per hour" },
  { value: "daily",  label: "Per day" },
]

const roles = [
  { value: "client",   label: "I need help",      subtitle: "Find & hire professionals" },
  { value: "provider", label: "I offer services",  subtitle: "Get hired & earn money" },
]

const EMPTY_SVC = {
  title: "", parentId: "", subId: "",
  customParent: "", customSub: "",
  description: "", price: "", priceType: "fixed",
}

function OtpInput({ value, onChange }) {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !e.target.value && i > 0) refs[i - 1].current?.focus()
  }

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1)
    const arr = (value + "      ").slice(0, 6).split("")
    arr[i] = digit
    onChange(arr.join("").trimEnd())
    if (digit && i < 5) refs[i + 1].current?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted) {
      onChange(pasted)
      refs[Math.min(pasted.length, 5)].current?.focus()
      e.preventDefault()
    }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          className="w-11 h-12 text-center text-lg font-bold rounded-md border border-input bg-background
            focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        />
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState("form")   // "form" | "otp"
  const [otp, setOtp] = useState("")
  const [formSnapshot, setFormSnapshot] = useState(null)
  const [groupedCats, setGroupedCats] = useState([])
  const [svc, setSvc] = useState(EMPTY_SVC)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: "client" },
  })

  const selectedRole = watch("role")

  useEffect(() => {
    if (selectedRole === "provider" && groupedCats.length === 0) {
      servicesApi.categoriesGrouped()
        .then(r => setGroupedCats(r.data.results ?? r.data))
        .catch(() => {})
    }
  }, [selectedRole])

  const setSvcField = (field) => (e) => setSvc(s => ({ ...s, [field]: e.target.value }))

  const setParent = (v) => setSvc(s => ({ ...s, parentId: v, subId: "", customParent: "", customSub: "" }))
  const setSub   = (v) => setSvc(s => ({ ...s, subId: v, customSub: "" }))

  const selectedParent = groupedCats.find(c => String(c.id) === svc.parentId)

  // Resolve the category_id to submit:
  // real sub → use sub id; "other" sub → use parent id; "other" parent → use Miscellaneous id
  function resolveCategory() {
    if (svc.subId && svc.subId !== "other") return parseInt(svc.subId)
    if (svc.parentId && svc.parentId !== "other") return parseInt(svc.parentId)
    const misc = groupedCats.find(c => c.name.toLowerCase().includes("miscellaneous"))
    return misc ? misc.id : null
  }

  const parentOk = svc.parentId === "other" ? svc.customParent.trim() : svc.parentId
  const subOk    = svc.parentId === "other"
    ? svc.customSub.trim()
    : svc.subId === "other" ? svc.customSub.trim() : svc.subId
  const serviceIsFilled = svc.title.trim() && parentOk && subOk && svc.description.trim() && svc.price

  // Step 1: validate form fields then send OTP
  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.sendOtp(data.email)
      setFormSnapshot(data)
      setStep("otp")
      toast.success("Verification code sent — check your email.")
    } catch (err) {
      const errs = err.response?.data
      const msg = errs ? Object.values(errs).flat().join(" ") : "Could not send verification email."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify OTP then create the account
  const onVerify = async () => {
    if (otp.length < 6) { toast.error("Enter the full 6-digit code."); return }
    setLoading(true)
    try {
      const data = { ...formSnapshot, otp }
      await authApi.register(data)
      const user = await login({ email: data.email, password: data.password })

      if (user.role === "provider" && serviceIsFilled) {
        const catId = resolveCategory()
        try {
          await servicesApi.providerProfile()
          if (catId) {
            await servicesApi.create({
              title: svc.title.trim(),
              category_id: catId,
              description: svc.description.trim(),
              price: parseFloat(svc.price),
              price_type: svc.priceType,
            })
            toast.success("Account created and your first service is live!")
          } else {
            toast.success("Welcome to Service Hub!")
            toast.warning("Couldn't categorise your service — add it from your dashboard.")
          }
        } catch {
          toast.success("Welcome to Service Hub!")
          toast.warning("Couldn't publish your service — add it from your dashboard.")
        }
      } else {
        toast.success("Welcome to Service Hub!")
      }

      navigate(user.role === "provider" ? "/provider/dashboard" : "/client/dashboard")
    } catch (err) {
      const errs = err.response?.data
      const msg = errs ? Object.values(errs).flat().join(" ") : "Registration failed."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (!formSnapshot) return
    setLoading(true)
    try {
      await authApi.sendOtp(formSnapshot.email)
      setOtp("")
      toast.success("New code sent.")
    } catch {
      toast.error("Could not resend code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 cursor-pointer">
          <div className="w-9 h-9 rounded-md bg-foreground flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-background" />
          </div>
          <span className="font-bold text-xl text-foreground tracking-tight">Service Hub</span>
        </Link>

        <div className="bg-card rounded-lg border border-border shadow-sm p-8">
          <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm mb-6">Join thousands of professionals and clients.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3">
              {roles.map(({ value, label, subtitle }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("role", value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-4 rounded-md border-2 text-center transition-all duration-150 cursor-pointer",
                    selectedRole === value
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground/30 bg-background"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center",
                    selectedRole === value ? "bg-foreground" : "bg-muted"
                  )}>
                    <User className={cn("w-4 h-4", selectedRole === value ? "text-background" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{subtitle}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-medium text-foreground text-sm">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="you@example.com" type="email" className="pl-9 text-sm" autoCapitalize="none" autoCorrect="off" spellCheck="false" {...register("email")} />
                </div>
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="font-medium text-foreground text-sm">Username *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="johndoe" className="pl-9 text-sm" {...register("username")} />
                </div>
                {errors.username && <p className="text-destructive text-xs">{errors.username.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-medium text-foreground text-sm">Phone (optional)</Label>
              <PhoneInput
                value={watch("phone") ?? ""}
                onChange={v => setValue("phone", v)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-medium text-foreground text-sm">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <PasswordInput placeholder="Min. 8 chars" className="pl-9 text-sm" {...register("password")} />
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="font-medium text-foreground text-sm">Confirm *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <PasswordInput placeholder="Repeat password" className="pl-9 text-sm" {...register("password2")} />
                </div>
                {errors.password2 && <p className="text-destructive text-xs">{errors.password2.message}</p>}
              </div>
            </div>

            {/* Provider: first service section */}
            <AnimatePresence>
              {selectedRole === "provider" && (
                <motion.div
                  key="service-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm font-semibold text-foreground">
                        Your first service{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </p>
                    </div>

                    {/* Service title */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Service title</Label>
                      <Input
                        placeholder="e.g. Professional home cleaning"
                        value={svc.title}
                        onChange={setSvcField("title")}
                        className="text-sm"
                      />
                    </div>

                    {/* Step 1 — parent category */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Category group</Label>
                      <Select value={svc.parentId} onValueChange={setParent}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select a category group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupedCats.map(cat => (
                            <SelectItem key={cat.id} value={String(cat.id)} className="text-sm">
                              {cat.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="other" className="text-sm text-muted-foreground">
                            Other (not listed)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {svc.parentId === "other" && (
                        <Input
                          placeholder="e.g. Marine Services"
                          value={svc.customParent}
                          onChange={setSvcField("customParent")}
                          className="text-sm"
                        />
                      )}
                    </div>

                    {/* Step 2 — specific service (shown once parent is chosen) */}
                    <AnimatePresence>
                      {svc.parentId && (
                        <motion.div
                          key="sub-section"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-1.5"
                        >
                          <Label className="text-sm font-medium text-foreground">Specific service</Label>

                          {svc.parentId === "other" ? (
                            /* Parent is custom → just a free text field */
                            <Input
                              placeholder="e.g. Boat repair technician"
                              value={svc.customSub}
                              onChange={setSvcField("customSub")}
                              className="text-sm"
                            />
                          ) : (
                            <>
                              <Select value={svc.subId} onValueChange={setSub}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select your specific service" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(selectedParent?.subcategories ?? []).map(sub => (
                                    <SelectItem key={sub.id} value={String(sub.id)} className="text-sm">
                                      {sub.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="other" className="text-sm text-muted-foreground">
                                    Other (not listed)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {svc.subId === "other" && (
                                <Input
                                  placeholder="Describe your specific service"
                                  value={svc.customSub}
                                  onChange={setSvcField("customSub")}
                                  className="text-sm mt-1.5"
                                />
                              )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Description</Label>
                      <Textarea
                        placeholder="Describe what you offer, your experience, tools used…"
                        value={svc.description}
                        onChange={setSvcField("description")}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Price + type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">Price (FCFA)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">XAF</span>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="5000"
                            value={svc.price}
                            onChange={setSvcField("price")}
                            className="pl-11 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">Pricing type</Label>
                        <Select value={svc.priceType} onValueChange={v => setSvc(s => ({ ...s, priceType: v }))}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-2.5 rounded-md font-semibold text-sm
                cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50
                hover:opacity-85 transition-opacity"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send Verification Code
            </button>
          </form>

          {/* OTP verification step */}
          <AnimatePresence>
            {step === "otp" && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mt-5 space-y-5 border-t border-border pt-5"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Check your email</p>
                    <p className="text-xs text-muted-foreground">
                      We sent a 6-digit code to <strong>{formSnapshot?.email}</strong>. It expires in 10 minutes.
                    </p>
                  </div>
                </div>

                <OtpInput value={otp} onChange={setOtp} />

                <button
                  type="button"
                  onClick={onVerify}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-foreground text-background py-2.5 rounded-md font-semibold text-sm
                    cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50
                    hover:opacity-85 transition-opacity"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create My Account
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  Didn't receive it?{" "}
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={loading}
                    className="text-foreground font-semibold hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend code
                  </button>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setOtp("") }}
                    className="text-foreground font-semibold hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground font-semibold hover:underline cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
