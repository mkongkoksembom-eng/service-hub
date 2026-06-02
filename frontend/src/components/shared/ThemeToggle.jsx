import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"

export default function ThemeToggle({ className = "" }) {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative w-9 h-9 rounded-md flex items-center justify-center cursor-pointer
        transition-colors duration-200 hover:bg-secondary text-muted-foreground hover:text-foreground
        ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Sun className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Moon className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
