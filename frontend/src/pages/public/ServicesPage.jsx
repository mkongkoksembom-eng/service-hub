import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Search, MapPin, Star, SlidersHorizontal, X, Zap } from "lucide-react"
import { servicesApi } from "@/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"

function ServiceCard({ service }) {
  return (
    <Link to={`/services/${service.id}`} className="cursor-pointer group">
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow duration-200 h-full ${service.is_featured ? "ring-2 ring-amber-400" : ""}`}>
        <div className="bg-muted h-40 flex items-center justify-center overflow-hidden relative">
          {service.is_featured && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-400 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
              <Zap className="w-3 h-3" /> Featured
            </div>
          )}
          {service.image
            ? <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <span className="text-4xl font-bold text-slate-300">{service.title[0]}</span>
              </div>
          }
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-cta transition-colors">{service.title}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs capitalize">{service.price_type}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{service.provider_name}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />{service.location || "Remote"}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {parseFloat(service.average_rating).toFixed(1)}
            </div>
          </div>
          <p className="text-base font-bold text-primary">
            {parseFloat(service.price).toLocaleString()} FCFA
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {service.price_type}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ServiceCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  )
}

const SORT_LABELS = {
  "-created_at": "Newest first",
  "price": "Price: Low to High",
  "-price": "Price: High to Low",
  "-provider__average_rating": "Top rated",
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [groupedCategories, setGroupedCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({ category: "", price_type: "", ordering: "-created_at" })
  const [showFilters, setShowFilters] = useState(false)

  const fetchServices = async () => {
    setLoading(true)
    try {
      const params = { search, ...filters }
      if (!params.category) delete params.category
      if (!params.price_type) delete params.price_type
      const { data } = await servicesApi.list(params)
      setServices(data.results)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => {
    servicesApi.categoriesGrouped().then(({ data }) => {
      setGroupedCategories(data.results || data)
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchServices, 300)
    return () => clearTimeout(t)
  }, [search, filters])

  const clearFilters = () => setFilters({ category: "", price_type: "", ordering: "-created_at" })
  const hasFilters = filters.category || filters.price_type

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-primary">Browse Services</h1>
        <p className="text-muted-foreground">Find trusted professionals for any job</p>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services, providers, locations…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="cursor-pointer gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {hasFilters && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="cursor-pointer">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-background rounded-lg border border-border">
          {/* Grouped category selector */}
          <Select
            value={filters.category}
            onValueChange={(v) => setFilters(f => ({ ...f, category: v === "all" ? "" : v }))}
          >
            <SelectTrigger className="w-64 cursor-pointer">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">All categories</SelectItem>
              {groupedCategories.map(parent => (
                <SelectGroup key={parent.id}>
                  <SelectLabel className="text-xs font-bold text-primary px-2 py-1.5 bg-muted/50">
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

          <Select value={filters.price_type} onValueChange={(v) => setFilters(f => ({ ...f, price_type: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-40 cursor-pointer"><SelectValue placeholder="Price type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any type</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.ordering} onValueChange={(v) => setFilters(f => ({ ...f, ordering: v }))}>
            <SelectTrigger className="w-44 cursor-pointer"><SelectValue>{SORT_LABELS[filters.ordering] || "Sort by"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_at">Newest first</SelectItem>
              <SelectItem value="price">Price: Low to High</SelectItem>
              <SelectItem value="-price">Price: High to Low</SelectItem>
              <SelectItem value="-provider__average_rating">Top rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results */}
      <div>
        {!loading && (
          <p className="text-sm text-muted-foreground mb-4">
            {services.length} service{services.length !== 1 ? "s" : ""} found
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ServiceCardSkeleton key={i} />)
            : services.length === 0
            ? <div className="col-span-full text-center py-16 text-muted-foreground">No services found. Try adjusting your search.</div>
            : services.map(s => <ServiceCard key={s.id} service={s} />)
          }
        </div>
      </div>
    </div>
  )
}
