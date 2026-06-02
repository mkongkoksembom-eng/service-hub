import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { authApi } from "@/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import PasswordInput from "@/components/shared/PasswordInput"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (newPassword !== confirm) { setError("Passwords do not match."); return }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }

    setLoading(true)
    try {
      await authApi.passwordResetConfirm({ uid, token, new_password: newPassword })
      setDone(true)
      setTimeout(() => navigate("/login"), 3000)
    } catch (err) {
      const data = err.response?.data
      if (data?.token) setError("This reset link is invalid or has expired. Please request a new one.")
      else if (data?.new_password) setError(data.new_password.join(" "))
      else setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary rounded-xl p-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Service Hub</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Choose a strong password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-primary">Password reset successfully!</p>
                  <p className="text-sm text-muted-foreground">Redirecting you to login…</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="new-password">New Password</Label>
                  <PasswordInput
                    id="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <PasswordInput
                    id="confirm"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-3">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/forgot-password" className="hover:underline cursor-pointer">
                    Request a new link
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
