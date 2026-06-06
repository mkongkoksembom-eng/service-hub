import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true, // send HttpOnly JWT cookies on every request
})

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"]
  }
  return config
})

let _refreshing = null // deduplicate concurrent refresh attempts

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.includes("/users/login/")
      || original?.url?.includes("/users/token/refresh/")
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        // Reuse an in-flight refresh so parallel 401s don't fire multiple refreshes
        if (!_refreshing) {
          _refreshing = axios.post("/api/users/token/refresh/", {}, { withCredentials: true })
            .finally(() => { _refreshing = null })
        }
        await _refreshing
        return api(original) // retry with the new cookie the server just set
      } catch {
        localStorage.removeItem("is_logged_in")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
