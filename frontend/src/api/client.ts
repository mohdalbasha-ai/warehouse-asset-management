import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        localStorage.setItem("accessToken", data.accessToken);
        queue.forEach((p) => p.resolve(data.accessToken));
        queue = [];
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
