import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Loader2, Briefcase, Mail, Lock } from "lucide-react"
import PasswordInput from "@/components/shared/PasswordInput"
import { statsApi } from "@/api"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ThemeToggle from "@/components/shared/ThemeToggle"

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    statsApi.public().then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data)
      toast.success(`Welcome back, ${user.username}!`)
      if (user.role === "provider") navigate("/provider/dashboard")
      else if (user.role === "admin") navigate("/admin/dashboard")
      else navigate("/client/dashboard")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-foreground relative overflow-hidden flex-col items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center"
        >
          <div className="w-16 h-16 rounded-xl bg-background/10 border border-background/20 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-background" />
          </div>
          <h2 className="text-4xl font-bold text-background mb-3 tracking-tight">
            Service Hub
          </h2>
          <p className="text-background/60 text-base max-w-xs mx-auto leading-relaxed">
            Cameroon's marketplace for skilled professionals.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 text-center">
            {[
              [stats ? stats.total_providers.toLocaleString() : "—", "Providers"],
              [stats ? stats.total_clients.toLocaleString()   : "—", "Clients"],
              [stats ? `${stats.average_rating}★`             : "—", "Rating"],
              [stats ? stats.total_categories.toLocaleString(): "—", "Categories"],
            ].map(([v, l]) => (
              <div key={l} className="bg-background/8 border border-background/12 rounded-lg p-4">
                <p className="text-xl font-bold text-background">{v}</p>
                <p className="text-xs text-background/50 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8 cursor-pointer lg:hidden">
              <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-background" />
              </div>
              <span className="font-bold text-lg text-foreground">Service Hub</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-medium text-foreground text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com"
                  className="pl-9"
                  {...register("email")} />
              </div>
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium text-foreground text-sm">Password</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <PasswordInput id="password" placeholder="••••••••"
                  className="pl-9"
                  {...register("password")} />
              </div>
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-2.5 rounded-md font-semibold text-sm
                cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50
                hover:opacity-85 transition-opacity"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            No account?{" "}
            <Link to="/register" className="text-foreground font-semibold hover:underline cursor-pointer">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
