import api from "./client"

// Auth
export const authApi = {
  register: (data) => api.post("/users/register/", data),
  sendOtp: (email) => api.post("/users/send-otp/", { email }),
  login: (data) => api.post("/users/login/", data),
  logout: () => api.post("/users/logout/"),
  refreshToken: () => api.post("/users/token/refresh/"),
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
  sendMessage: (bookingId, content) => api.post(`/chat/${bookingId}/`, { content, msg_type: "text" }),
  sendFile: (bookingId, file, msgType) => {
    const form = new FormData()
    form.append("msg_type", msgType)
    form.append("file", file)
    return api.post(`/chat/${bookingId}/`, form, { headers: { "Content-Type": undefined } })
  },
  heartbeat: () => api.post("/chat/heartbeat/"),
  presence: (ids) => api.get("/chat/presence/", { params: { ids: ids.join(",") } }),
}

// Jobs
export const jobsApi = {
  list: (params) => api.get("/jobs/", { params }),
  detail: (id) => api.get(`/jobs/${id}/`),
  create: (data) => api.post("/jobs/post/", data),
  update: (id, data) => api.patch(`/jobs/my/${id}/edit/`, data),
  cancel: (id) => api.post(`/jobs/my/${id}/cancel/`),
  myJobs: () => api.get("/jobs/my/"),
  applications: (id) => api.get(`/jobs/my/${id}/applications/`),
  acceptApplication: (id, appId) => api.post(`/jobs/my/${id}/applications/${appId}/accept/`),
  apply: (id, data) => api.post(`/jobs/${id}/apply/`, data),
  appliedJobs: () => api.get("/jobs/applied/"),
  withdrawApplication: (id, appId) => api.post(`/jobs/${id}/applications/${appId}/withdraw/`),
}

// Stats
export const statsApi = {
  public: () => api.get("/users/stats/"),
  adminDashboard: () => api.get("/users/admin/dashboard/"),
}

