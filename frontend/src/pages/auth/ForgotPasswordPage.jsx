import { useState } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { authApi } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.passwordResetRequest(email)
      setSent(true)
    } catch {
      setError("Something went wrong. Please try again.")
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
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-primary">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">
                    If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                  </p>
                </div>
                <Link to="/login">
                  <Button variant="outline" className="cursor-pointer gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      autoCapitalize="none" autoCorrect="off" spellCheck="false"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-destructive text-xs">{error}</p>}
                </div>
                <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
                <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
