import { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  dark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// KMS is light-mode only — no toggle, no stored/system preference. `dark` stays here
// (rather than deleting useTheme entirely) purely so every existing `dark ? ... : ...`
// branch and `dark:` Tailwind class throughout the app keeps working unchanged, just
// permanently resolved to its light-mode path.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Strips a `dark` class a previous visit may have left on <html> (from before this
    // was made light-only), and clears the old stored preference so it can't linger.
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('kms-theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ dark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
