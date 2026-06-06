import { useEffect, useRef, useState, useCallback } from "react"
import { Navigation, X, Loader2, MapPin, Compass, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { locationApi } from "@/api"
import { toast } from "sonner"

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"
const PUSH_INTERVAL = 10000
const POLL_INTERVAL = 8000

function distanceKm(a, b) {
  const R = 6371
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude  * Math.PI) / 180
  const lat2 = (b.latitude  * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function makePulsingMarker(color, label) {
  const el = document.createElement("div")
  el.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;"
  const id = color.replace("#", "c")
  el.innerHTML = `
    <style>
      @keyframes pulse-${id}{0%{transform:scale(1);opacity:.8}50%{transform:scale(1.7);opacity:.25}100%{transform:scale(1);opacity:.8}}
    </style>
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.3;animation:pulse-${id} 2s ease-in-out infinite;"></div>
      <div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);position:relative;z-index:1;"></div>
    </div>
    <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);margin-top:2px;">${escapeHtml(label)}</div>
  `
  return el
}

export default function BookingMap({ bookingId, myRole }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const mlRef         = useRef(null)   // maplibre-gl module
  const markersRef    = useRef({})
  const pushTimerRef  = useRef(null)
  const pollTimerRef  = useRef(null)

  const [sharing,   setSharing]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [mapReady,  setMapReady]  = useState(false)
  const [mapError,  setMapError]  = useState(null)
  const [locations, setLocations] = useState({})
  const [distance,  setDistance]  = useState(null)
  const [pitch,     setPitch]     = useState(45)

  const otherRole = myRole === "client" ? "provider" : "client"

  // ── Load maplibre dynamically then init map ───────────────────
  useEffect(() => {
    if (mapRef.current) return
    let cancelled = false

    Promise.all([
      import("maplibre-gl"),
      fetch(MAP_STYLE_URL).then(r => r.json()),
    ])
      .then(([mod, style]) => {
        if (cancelled) return
        const ml = mod.default ?? mod
        mlRef.current = ml

        // Fix: set maxzoom on the vector source so MapLibre overzooms
        // tile data from zoom 14 instead of requesting non-existent tiles
        if (style.sources?.openmaptiles) {
          style.sources.openmaptiles.maxzoom = 14
        }

        const map = new ml.Map({
          container: containerRef.current,
          style,                          // patched style object
          center: [11.502, 3.848],
          zoom: 14,
          maxZoom: 19,
          pitch: 45,
          bearing: -15,
          antialias: true,
        })

        map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right")

        map.on("load", () => {
          if (cancelled) return

          // Route line source
          // Note: 3D buildings are already in the liberty style as "building-3d"
          map.addSource("route", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
          })
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: { "line-color": "#6366f1", "line-width": 3, "line-dasharray": [2, 3], "line-opacity": 0.85 },
          })

          mapRef.current = map
          setMapReady(true)
        })

        map.on("error", e => {
          console.warn("MapLibre error:", e)
        })
      })
      .catch(err => {
        console.error("Map load error:", err)
        setMapError("Could not load map. Check your internet connection and refresh.")
      })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Update markers + route ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const ml  = mlRef.current
    if (!mapReady || !map || !ml) return

    const COLORS = { client: "#2563eb", provider: "#dc2626" }

    Object.entries(locations).forEach(([role, loc]) => {
      const lngLat = [loc.longitude, loc.latitude]
      const color  = COLORS[role] || "#6366f1"
      const label  = loc.is_me ? "You" : loc.username

      if (markersRef.current[role]) {
        markersRef.current[role].setLngLat(lngLat)
      } else {
        const el = makePulsingMarker(color, label)
        markersRef.current[role] = new ml.Marker({ element: el, anchor: "bottom" })
          .setLngLat(lngLat)
          .setPopup(new ml.Popup({ offset: 25 }).setHTML(
            `<strong style="font-size:13px">${escapeHtml(loc.username)}</strong><br>
             <span style="font-size:11px;color:#64748b;text-transform:capitalize">${escapeHtml(role)}</span>`
          ))
          .addTo(map)
      }
    })

    // Remove stale markers
    Object.keys(markersRef.current).forEach(role => {
      if (!locations[role]) { markersRef.current[role].remove(); delete markersRef.current[role] }
    })

    // Route line
    const pts = Object.values(locations).map(l => [l.longitude, l.latitude])
    try {
      map.getSource("route")?.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: pts },
      })
    } catch { /* silent */ }

    // Distance
    const locs = Object.values(locations)
    setDistance(locs.length === 2 ? distanceKm(locs[0], locs[1]) : null)

    // Camera
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 15, pitch: 45, speed: 1.2 })
    } else if (pts.length >= 2) {
      try {
        const bounds = pts.reduce(
          (b, p) => b.extend(p),
          new ml.LngLatBounds(pts[0], pts[0])
        )
        map.fitBounds(bounds, { padding: 80, pitch: 45, maxZoom: 16, duration: 1200 })
      } catch { /* silent */ }
    }
  }, [locations, mapReady])

  // ── Fetch locations ───────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await locationApi.get(bookingId)
      setLocations(data.locations || {})
    } catch { /* silent */ }
  }, [bookingId])

  // ── Push GPS ──────────────────────────────────────────────────
  const pushLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await locationApi.update(bookingId, coords.latitude, coords.longitude)
          fetchLocations()
        } catch { /* silent */ }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [bookingId, fetchLocations])

  // ── Start sharing ─────────────────────────────────────────────
  const startSharing = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await locationApi.update(bookingId, coords.latitude, coords.longitude)
          setSharing(true)
          fetchLocations()
          pushTimerRef.current = setInterval(pushLocation, PUSH_INTERVAL)
          pollTimerRef.current = setInterval(fetchLocations, POLL_INTERVAL)
        } catch { toast.error("Failed to share location.") }
        finally { setLoading(false) }
      },
      () => { toast.error("Location permission denied."); setLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Stop sharing ──────────────────────────────────────────────
  const stopSharing = async () => {
    clearInterval(pushTimerRef.current)
    clearInterval(pollTimerRef.current)
    try { await locationApi.stop(bookingId) } catch { /* silent */ }
    setSharing(false)
    setLocations(prev => { const n = { ...prev }; delete n[myRole]; return n })
  }

  const togglePitch = () => {
    const next = pitch === 45 ? 0 : 45
    setPitch(next)
    mapRef.current?.easeTo({ pitch: next, duration: 600 })
  }

  useEffect(() => () => {
    clearInterval(pushTimerRef.current)
    clearInterval(pollTimerRef.current)
  }, [])

  if (mapError) return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive text-center">
      {mapError}
    </div>
  )

  return (
    <div className="space-y-2">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-border shadow-lg" style={{ height: 320 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {!mapReady && (
          <div className="absolute inset-0 bg-secondary flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading map…
          </div>
        )}

        {/* Distance badge */}
        {distance !== null && (
          <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs font-semibold shadow flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-indigo-500" />
            {distance < 1 ? `${Math.round(distance * 1000)} m apart` : `${distance.toFixed(2)} km apart`}
          </div>
        )}

        {/* Map mode toggle */}
        {mapReady && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            <button onClick={togglePitch}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs font-medium shadow hover:bg-secondary transition-colors cursor-pointer flex items-center gap-1">
              <Compass className="w-3 h-3" /> {pitch === 45 ? "2D" : "3D"}
            </button>
            <button onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 45, duration: 600 })}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs font-medium shadow hover:bg-secondary transition-colors cursor-pointer flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        )}

        {/* Legend */}
        {mapReady && (
          <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs space-y-1 shadow">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
              <span className="font-medium">Client {myRole === "client" ? "(you)" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm" />
              <span className="font-medium">Provider {myRole === "provider" ? "(you)" : ""}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {!sharing ? (
          <Button size="sm" onClick={startSharing} disabled={loading || !mapReady} className="gap-1.5 cursor-pointer">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            Share my location
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopSharing} className="gap-1.5 cursor-pointer">
            <X className="w-3.5 h-3.5" /> Stop sharing
          </Button>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${sharing ? "text-blue-600 font-medium" : ""}`}>
            <div className={`w-2 h-2 rounded-full ${sharing ? "bg-blue-600 animate-pulse" : "bg-muted-foreground/40"}`} />
            You: {sharing ? "live" : "off"}
          </span>
          <span className={`flex items-center gap-1 ${locations[otherRole] ? "text-red-600 font-medium" : ""}`}>
            <div className={`w-2 h-2 rounded-full ${locations[otherRole] ? "bg-red-600 animate-pulse" : "bg-muted-foreground/40"}`} />
            {otherRole === "provider" ? "Provider" : "Client"}: {locations[otherRole] ? "live" : "off"}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your location is only shared with the {otherRole} of this booking. You can stop at any time.
      </p>
    </div>
  )
}
