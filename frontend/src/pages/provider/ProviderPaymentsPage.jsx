import { useEffect, useState } from "react"
import { paymentsApi } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-600",
}

export default function ProviderPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await paymentsApi.providerPayments()
      setPayments(data.results || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const refund = async (id) => {
    if (!confirm("Issue a refund for this payment?")) return
    setRefunding(id)
    try {
      await paymentsApi.refund(id)
      toast.success("Refund issued successfully.")
      load()
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || "Refund failed.")
    } finally { setRefunding(null) }
  }

  const paidPayments = payments.filter(p => p.status === "paid")
  const revenue     = paidPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const netRevenue  = paidPayments.reduce((s, p) => s + parseFloat(p.provider_amount || p.amount), 0)
  const commission  = paidPayments.reduce((s, p) => s + parseFloat(p.commission_amount || 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Payments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{netRevenue.toLocaleString()} FCFA</p>
              <p className="text-xs text-emerald-600">Your earnings (after 5% commission)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-secondary text-muted-foreground">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{revenue.toLocaleString()} FCFA</p>
              <p className="text-xs text-muted-foreground">Gross revenue (total billed)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-secondary text-muted-foreground">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{commission.toLocaleString()} FCFA</p>
              <p className="text-xs text-muted-foreground">Platform commission (5%)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
          : payments.length === 0
          ? <p className="text-center text-muted-foreground py-16">No payments yet.</p>
          : payments.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.booking?.service?.title || "Service"}</p>
                    <p className="text-xs text-muted-foreground">Client: {p.client?.username || "—"}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="font-bold text-primary text-base">{parseFloat(p.amount).toLocaleString()} FCFA</span>
                  <Badge variant="outline" className="capitalize text-xs">{p.method?.replace("_", " ")}</Badge>
                  {p.paid_at && <span className="text-xs text-muted-foreground">Paid: {new Date(p.paid_at).toLocaleDateString()}</span>}
                  {p.refunded_at && <span className="text-xs text-muted-foreground">Refunded: {new Date(p.refunded_at).toLocaleDateString()}</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono">Ref: {p.transaction_id}</p>
                {p.status === "paid" && (
                  <Button size="sm" variant="outline" onClick={() => refund(p.id)}
                    disabled={refunding === p.id} className="cursor-pointer">
                    {refunding === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Issue Refund
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  )
}
