import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  picture?: string;
  role: string;
  loginType?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { success: boolean; user?: User; error?: string };
  googleLogin: (credential: string) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local accounts (system / admin access)
const LOCAL_USERS = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
  { id: 2, username: 'viewer', password: 'viewer123', role: 'viewer', name: 'Viewer User' },
];

const ADMIN_EMAILS: string[] = [
  // 'yourname@dict.gov.ph',
];

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'dict.gov.ph';

/** Safely decode a JWT payload without a library */
function decodeJwtPayload(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('kms-user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username: string, password: string) => {
    const found = LOCAL_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (found) {
      const { password: _, ...safeUser } = found;
      setUser(safeUser as User);
      localStorage.setItem('kms-user', JSON.stringify(safeUser));
      return { success: true, user: safeUser as User };
    }
    return { success: false, error: 'Invalid username or password.' };
  };

  const googleLogin = (credential: string) => {
    try {
      const payload = decodeJwtPayload(credential);
      const email = payload.email || '';

      if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        return {
          success: false,
          error: `Only @${ALLOWED_DOMAIN} Google accounts are allowed.`,
        };
      }

      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'viewer';

      const googleUser: User = {
        name: payload.name,
        email,
        picture: payload.picture,
        role,
        loginType: 'google',
      };

      setUser(googleUser);
      localStorage.setItem('kms-user', JSON.stringify(googleUser));
      return { success: true, user: googleUser };
    } catch {
      return { success: false, error: 'Failed to process Google sign-in. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kms-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
