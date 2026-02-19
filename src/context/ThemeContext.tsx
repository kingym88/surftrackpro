import React, { createContext, useContext, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'surftrack_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark per SurfMind Dark Design System
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const { value } = await Preferences.get({ key: THEME_KEY });
      if (value === 'light' || value === 'dark') {
        setTheme(value);
      } else {
        // Option to detect system preference here
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
      setIsMounted(true);
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Save preference
    Preferences.set({ key: THEME_KEY, value: theme });
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Prevent flash of wrong theme
  if (!isMounted) return <div className="min-h-screen bg-deepNavy"></div>;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
