import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/AuthContext"
import { ThemeProvider } from "@/context/ThemeContext"

import ProtectedRoute from "@/components/layout/ProtectedRoute"
import PublicLayout from "@/components/layout/PublicLayout"
import DashboardLayout from "@/components/layout/DashboardLayout"

import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage"
import LandingPage from "@/pages/public/LandingPage"
import ServicesPage from "@/pages/public/ServicesPage"
import ServiceDetailPage from "@/pages/public/ServiceDetailPage"
import ProviderProfilePage from "@/pages/public/ProviderProfilePage"
import ClientDashboard from "@/pages/client/ClientDashboard"
import ClientBookingsPage from "@/pages/client/ClientBookingsPage"
import ClientReviewsPage from "@/pages/client/ClientReviewsPage"
import NotificationsPage from "@/pages/client/NotificationsPage"
import ProfilePage from "@/pages/ProfilePage"
import ProviderDashboard from "@/pages/provider/ProviderDashboard"
import ProviderBookingsPage from "@/pages/provider/ProviderBookingsPage"
import ProviderServicesPage from "@/pages/provider/ProviderServicesPage"
import ProviderPaymentsPage from "@/pages/provider/ProviderPaymentsPage"
import AdminDashboard from "@/pages/admin/AdminDashboard"

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/:id" element={<ServiceDetailPage />} />
              <Route path="/providers/:id" element={<ProviderProfilePage />} />
            </Route>

            {/* Client routes */}
            <Route element={<ProtectedRoute roles={["client"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/bookings" element={<ClientBookingsPage />} />
                <Route path="/client/reviews" element={<ClientReviewsPage />} />
                <Route path="/client/notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* Provider routes */}
            <Route element={<ProtectedRoute roles={["provider"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/provider/dashboard" element={<ProviderDashboard />} />
                <Route path="/provider/bookings" element={<ProviderBookingsPage />} />
                <Route path="/provider/services" element={<ProviderServicesPage />} />
                <Route path="/provider/payments" element={<ProviderPaymentsPage />} />
                <Route path="/provider/notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>
            </Route>

            {/* Shared authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
