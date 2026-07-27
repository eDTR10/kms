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

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      secureStorage.removeItem("auth_token");
      secureStorage.removeItem("auth_user_profile");
      window.location.href = "/kms/login";
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
