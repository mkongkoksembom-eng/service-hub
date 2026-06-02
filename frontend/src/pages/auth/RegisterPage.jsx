import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Loader2, Briefcase, User, Mail, Lock, Phone } from "lucide-react"
import { authApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import ThemeToggle from "@/components/shared/ThemeToggle"
import PasswordInput from "@/components/shared/PasswordInput"

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

const roles = [
  { value: "client",   label: "I need help",      subtitle: "Find & hire professionals" },
  { value: "provider", label: "I offer services",  subtitle: "Get hired & earn money" },
]

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: "client" },
  })

  const selectedRole = watch("role")

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.register(data)
      const user = await login({ email: data.email, password: data.password })
      toast.success("Welcome to Service Hub!")
      if (user.role === "provider") navigate("/provider/dashboard")
      else navigate("/client/dashboard")
    } catch (err) {
      const errs = err.response?.data
      const msg = errs ? Object.values(errs).flat().join(" ") : "Registration failed."
      toast.error(msg)
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
                  <Input placeholder="you@example.com" type="email" className="pl-9 text-sm" {...register("email")} />
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
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="+237 6XX XXX XXX" type="tel" className="pl-9 text-sm" {...register("phone")} />
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-2.5 rounded-md font-semibold text-sm
                cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50
                hover:opacity-85 transition-opacity"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create My Account
            </button>
          </form>

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
