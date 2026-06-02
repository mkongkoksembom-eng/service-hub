import api from "./client"

// Auth
export const authApi = {
  register: (data) => api.post("/users/register/", data),
  login: (data) => api.post("/users/login/", data),
  refreshToken: (refresh) => api.post("/users/token/refresh/", { refresh }),
  getProfile: () => api.get("/users/profile/"),
  updateProfile: (data) => api.patch("/users/profile/", data),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append("avatar", file)
    // Remove the default JSON Content-Type so the browser can set the correct
    // multipart/form-data boundary automatically.
    return api.patch("/users/profile/", form, {
      headers: { "Content-Type": undefined },
    })
  },
  removeAvatar: () => api.patch("/users/profile/", { avatar: "" }),
  changePassword: (data) => api.post("/users/change-password/", data),
  passwordResetRequest: (email) => api.post("/users/password-reset/", { email }),
  passwordResetConfirm: (data) => api.post("/users/password-reset/confirm/", data),
}

// Services
export const servicesApi = {
  list: (params) => api.get("/services/", { params }),
  detail: (id) => api.get(`/services/${id}/`),
  create: (data) => api.post("/services/create/", data),
  update: (id, data) => api.patch(`/services/${id}/manage/`, data),
  delete: (id) => api.delete(`/services/${id}/manage/`),
  myServices: () => api.get("/services/my/"),
  categories: () => api.get("/services/categories/"),
  categoriesGrouped: () => api.get("/services/categories/grouped/"),
  providerProfile: () => api.get("/services/provider/profile/"),
  updateProviderProfile: (data) => api.put("/services/provider/profile/", data),
  getProvider: (id) => api.get(`/services/provider/${id}/`),
}

// Bookings
export const bookingsApi = {
  create: (data) => api.post("/bookings/", data),
  detail: (id) => api.get(`/bookings/${id}/`),
  myBookings: (params) => api.get("/bookings/my/", { params }),
  providerBookings: (params) => api.get("/bookings/provider/", { params }),
  updateStatus: (id, data) => api.patch(`/bookings/${id}/status/`, data),
}

// Reviews
export const reviewsApi = {
  create: (data) => api.post("/reviews/", data),
  update: (id, data) => api.patch(`/reviews/${id}/`, data),
  delete: (id) => api.delete(`/reviews/${id}/`),
  myReviews: () => api.get("/reviews/my/"),
  serviceReviews: (serviceId) => api.get(`/reviews/service/${serviceId}/`),
  providerReviews: (providerId) => api.get(`/reviews/provider/${providerId}/`),
}

// Notifications
export const notificationsApi = {
  list: (params) => api.get("/notifications/", { params }),
  unreadCount: () => api.get("/notifications/unread/"),
  markRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllRead: () => api.post("/notifications/mark-all-read/"),
}

// Location
export const locationApi = {
  update: (bookingId, latitude, longitude) =>
    api.post(`/location/${bookingId}/update/`, { latitude, longitude }),
  stop:   (bookingId) => api.post(`/location/${bookingId}/stop/`),
  get:    (bookingId) => api.get(`/location/${bookingId}/`),
}

// Chat
export const chatApi = {
  getMessages: (bookingId) => api.get(`/chat/${bookingId}/`),
  sendMessage: (bookingId, content) => api.post(`/chat/${bookingId}/`, { content }),
}

// Stats
export const statsApi = {
  public: () => api.get("/users/stats/"),
  adminDashboard: () => api.get("/users/admin/dashboard/"),
}

// Payments
export const paymentsApi = {
  create: (data) => api.post("/payments/", data),
  myPayments: (params) => api.get("/payments/my/", { params }),
  providerPayments: (params) => api.get("/payments/provider/", { params }),
  momoRequest: (id, phone_number) => api.post(`/payments/${id}/momo/request/`, { phone_number }),
  momoStatus: (id) => api.get(`/payments/${id}/momo/status/`),
  refund: (id) => api.post(`/payments/${id}/refund/`),
  createFeatured: (service_id) => api.post("/payments/featured/", { service_id }),
  featuredMomoRequest: (id, phone_number) => api.post(`/payments/featured/${id}/momo/request/`, { phone_number }),
  featuredMomoStatus: (id) => api.get(`/payments/featured/${id}/momo/status/`),
}
