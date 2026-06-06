import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const COUNTRIES = [
  { code: "CM", dial: "+237", name: "Cameroon",                  flag: "🇨🇲" },
  { code: "NG", dial: "+234", name: "Nigeria",                   flag: "🇳🇬" },
  { code: "GH", dial: "+233", name: "Ghana",                     flag: "🇬🇭" },
  { code: "SN", dial: "+221", name: "Senegal",                   flag: "🇸🇳" },
  { code: "CI", dial: "+225", name: "Côte d'Ivoire",             flag: "🇨🇮" },
  { code: "KE", dial: "+254", name: "Kenya",                     flag: "🇰🇪" },
  { code: "TZ", dial: "+255", name: "Tanzania",                  flag: "🇹🇿" },
  { code: "UG", dial: "+256", name: "Uganda",                    flag: "🇺🇬" },
  { code: "RW", dial: "+250", name: "Rwanda",                    flag: "🇷🇼" },
  { code: "ZA", dial: "+27",  name: "South Africa",              flag: "🇿🇦" },
  { code: "ET", dial: "+251", name: "Ethiopia",                  flag: "🇪🇹" },
  { code: "ML", dial: "+223", name: "Mali",                      flag: "🇲🇱" },
  { code: "BJ", dial: "+229", name: "Benin",                     flag: "🇧🇯" },
  { code: "BF", dial: "+226", name: "Burkina Faso",              flag: "🇧🇫" },
  { code: "TG", dial: "+228", name: "Togo",                      flag: "🇹🇬" },
  { code: "GA", dial: "+241", name: "Gabon",                     flag: "🇬🇦" },
  { code: "CD", dial: "+243", name: "DR Congo",                  flag: "🇨🇩" },
  { code: "CG", dial: "+242", name: "Republic of Congo",         flag: "🇨🇬" },
  { code: "CF", dial: "+236", name: "Central African Republic",  flag: "🇨🇫" },
  { code: "TD", dial: "+235", name: "Chad",                      flag: "🇹🇩" },
  { code: "MR", dial: "+222", name: "Mauritania",                flag: "🇲🇷" },
  { code: "NE", dial: "+227", name: "Niger",                     flag: "🇳🇪" },
  { code: "GN", dial: "+224", name: "Guinea",                    flag: "🇬🇳" },
  { code: "MZ", dial: "+258", name: "Mozambique",                flag: "🇲🇿" },
  { code: "ZM", dial: "+260", name: "Zambia",                    flag: "🇿🇲" },
  { code: "FR", dial: "+33",  name: "France",                    flag: "🇫🇷" },
  { code: "GB", dial: "+44",  name: "United Kingdom",            flag: "🇬🇧" },
  { code: "US", dial: "+1",   name: "United States",             flag: "🇺🇸" },
  { code: "CA", dial: "+1",   name: "Canada",                    flag: "🇨🇦" },
  { code: "DE", dial: "+49",  name: "Germany",                   flag: "🇩🇪" },
  { code: "BE", dial: "+32",  name: "Belgium",                   flag: "🇧🇪" },
  { code: "CH", dial: "+41",  name: "Switzerland",               flag: "🇨🇭" },
]

function parseValue(v) {
  if (!v) return { dial: "+237", local: "" }
  const country = COUNTRIES.find(c => v.startsWith(c.dial)) ?? COUNTRIES[0]
  return { dial: country.dial, local: v.slice(country.dial.length) }
}

/**
 * Controlled phone input with country code selector.
 *
 * Props:
 *   value    — full phone string e.g. "+2376XXXXXXXX"
 *   onChange — called with the new full phone string whenever dial or local changes
 *   placeholder — text for the number field (default "6XX XXX XXX")
 *   className — extra classes on the wrapper
 */
export default function PhoneInput({ value = "", onChange, placeholder = "6XX XXX XXX", className }) {
  const parsed = parseValue(value)
  const [dial, setDial] = useState(parsed.dial)
  const [local, setLocal] = useState(parsed.local)

  const handleDial = (newDial) => {
    setDial(newDial)
    onChange?.(newDial + local)
  }

  const handleLocal = (e) => {
    const digits = e.target.value.replace(/\D/g, "")
    setLocal(digits)
    onChange?.(dial + digits)
  }

  const selected = COUNTRIES.find(c => c.dial === dial) ?? COUNTRIES[0]

  return (
    <div className={cn(
      "flex rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
      className
    )}>
      <Select value={dial} onValueChange={handleDial}>
        <SelectTrigger className="w-[110px] shrink-0 rounded-none border-0 border-r border-input bg-muted focus:ring-0 focus:ring-offset-0 gap-1 text-sm">
          <SelectValue>
            <span>{selected.flag} {dial}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {COUNTRIES.map(c => (
            <SelectItem key={`${c.code}-${c.dial}`} value={c.dial}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="font-medium">{c.dial}</span>
                <span className="text-muted-foreground text-xs">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={local}
        onChange={handleLocal}
        className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-0"
      />
    </div>
  )
}
