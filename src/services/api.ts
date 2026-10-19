import { secureStorage } from "@/lib/secureStorage";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://127.0.0.1:8000/api/v1/";
const api = axios.create({ baseURL: BASE_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = secureStorage.getItem("auth_token");
  if (token) config.headers["Authorization"] = `Token ${token}`;
  return config;
});

// 401 handling. Tokens now expire server-side (30 days), and the backend rejects an
// expired token even on endpoints that don't need one (public pages, the login call
// itself). So when a request that CARRIED a token comes back 401, drop the dead token and
// retry once anonymously — public pages and login then just work. Only when that retry is
// also 401 (a protected endpoint) is the session really over: send them to the login page
// (unless they're already on it, which would loop). The first attempt failed at the auth
// step, so retrying a POST/PATCH can't double-apply it.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const original = err?.config;
    if (err?.response?.status === 401 && original) {
      if (original.headers?.Authorization && !original._retriedWithoutToken) {
        secureStorage.removeItem("auth_token");
        secureStorage.removeItem("auth_user_profile");
        original._retriedWithoutToken = true;
        delete original.headers.Authorization;
        return api(original);
      }
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = "/kms/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  office: number | null;
  acc_lvl: number;
  is_active: boolean;
  is_staff: boolean;
  projects: number[];
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<{ auth_token: string }>("token/login/", {
      email,
      password,
    });
    secureStorage.setItem("auth_token", data.auth_token);
    return data;
  },

  register: async (payload: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    re_password: string;
  }) => {
    const { data } = await api.post("users/", payload);
    return data;
  },

  logout: async () => {
    await api.post("token/logout/").catch(() => {});
    secureStorage.removeItem("auth_token");
  },

  getMe: async (signal?: AbortSignal): Promise<UserProfile> => {
    const { data } = await api.get<UserProfile>("users/me/", { signal });
    return data;
  },

  isAuthenticated: () => !!secureStorage.getItem("auth_token"),

  forgotPassword: (email: string) =>
    api.post("users/reset_password/", { email }).then((r) => r.data),

  resetPasswordConfirm: (
    uid: string,
    token: string,
    new_password: string,
    re_new_password: string
  ) =>
    api
      .post("users/reset_password_confirm/", {
        uid,
        token,
        new_password,
        re_new_password,
      })
      .then((r) => r.data),
};

export default api;
