import { secureStorage } from "@/lib/secureStorage";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, UserProfile } from "../services/api";

const AUTH_USER_STORAGE_KEY = "auth_user_profile";

export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  role: string;
  acc_lvl: number;
  loginType?: string;
  position?: string;
  office?: number | null;
  is_staff?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  googleLogin: (credential: string) => { success: boolean; user?: User; error?: string };
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS: string[] = [
  // 'yourname@dict.gov.ph',
];

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || "dict.gov.ph";

// ── helpers ──────────────────────────────────────────────────────────────────

function profileToUser(profile: UserProfile): User {
  const role = profile.acc_lvl === 0 ? "admin" : "viewer";
  return {
    id: profile.id,
    email: profile.email,
    name: `${profile.first_name} ${profile.last_name}`.trim() || profile.email,
    role,
    acc_lvl: profile.acc_lvl,
    position: profile.position,
    office: profile.office,
    is_staff: profile.is_staff,
  };
}

function loadStoredUser(): User | null {
  const raw = secureStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User) {
  secureStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  secureStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

/** Safely decode a JWT payload without a library */
function decodeJwtPayload(token: string) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

// ── migrate old plaintext kms-user to encrypted storage ──────────────────────
function migrateLegacyUser() {
  const legacy = localStorage.getItem("kms-user");
  if (legacy && !secureStorage.getItem(AUTH_USER_STORAGE_KEY)) {
    secureStorage.setItem(AUTH_USER_STORAGE_KEY, legacy);
    localStorage.removeItem("kms-user");
  }
}

// ── provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: migrate legacy data, then check token validity
  useEffect(() => {
    migrateLegacyUser();

    const fetchUser = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const me = await authApi.getMe();
          const mapped = profileToUser(me);
          setUser(mapped);
          saveStoredUser(mapped);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            authApi.logout();
            clearStoredUser();
            setUser(null);
          } else {
            // Network error etc. — fall back to cached profile
            const cached = loadStoredUser();
            if (cached) setUser(cached);
          }
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    await authApi.login(email, password);
    const me = await authApi.getMe();
    const mapped = profileToUser(me);
    setUser(mapped);
    saveStoredUser(mapped);
    return mapped;
  };

  const googleLogin = (credential: string) => {
    try {
      const payload = decodeJwtPayload(credential);
      const email = payload.email || "";

      if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        return {
          success: false,
          error: `Only @${ALLOWED_DOMAIN} Google accounts are allowed.`,
        };
      }

      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "viewer";

      const googleUser: User = {
        id: 0,
        email,
        name: payload.name || email,
        picture: payload.picture,
        role,
        acc_lvl: role === "admin" ? 0 : 1,
        loginType: "google",
      };

      setUser(googleUser);
      saveStoredUser(googleUser);
      return { success: true, user: googleUser };
    } catch {
      return {
        success: false,
        error: "Failed to process Google sign-in. Please try again.",
      };
    }
  };

  const logout = async () => {
    await authApi.logout();
    clearStoredUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        googleLogin,
        logout,
        isAdmin: user?.role === "admin" || user?.acc_lvl === 0,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
