import { useState } from "react"
import { Outlet } from "react-router-dom"
import { motion } from "framer-motion"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-8 gap-6">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 min-w-0"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}
