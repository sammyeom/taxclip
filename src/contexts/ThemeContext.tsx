'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { getUserSettings } from '@/lib/supabase';

type ThemeModeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeModeType;
  setThemeMode: (mode: ThemeModeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeModeType>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const { data } = await getUserSettings();
      if (data?.theme_mode) {
        // Map 'auto' to 'system' for next-themes compatibility
        const mode = data.theme_mode === 'auto' ? 'system' : data.theme_mode;
        setThemeMode(mode as ThemeModeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    );
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={themeMode}
      forcedTheme={themeMode !== 'system' ? themeMode : undefined}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
        {children}
      </ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
