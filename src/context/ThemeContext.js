import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'theme';

const themes = {
  light: {
    name: 'light',
    colors: {
      appBg: '#f9fafb',
      surfaceBg: '#ffffff',
      surfaceBgHover: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      textInverse: '#ffffff',
      border: '#e5e7eb',
      borderStrong: '#d1d5db',
      tableHeaderBg: '#e5e7eb',
      link: '#003c71',
      icon: '#6b7280',
      iconActive: '#374151',
      warningText: '#500000',
      warningTextSoft: '#fca5a5',
      alertBg: '#fef2f2',
      alertBorder: '#dc2626',
      alertText: '#991b1b',
      alertTextSecondary: '#b91c1c',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#cccccc'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      appBg: '#111827',
      surfaceBg: '#1f2937',
      surfaceBgHover: '#374151',
      textPrimary: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      textInverse: '#111827',
      border: '#374151',
      borderStrong: '#4b5563',
      tableHeaderBg: '#374151',
      link: '#60a5fa',
      icon: '#d1d5db',
      iconActive: '#e5e7eb',
      warningText: '#fca5a5',
      warningTextSoft: '#fca5a5',
      alertBg: 'rgba(127, 29, 29, 0.2)',
      alertBorder: '#b91c1c',
      alertText: '#fca5a5',
      alertTextSecondary: '#f87171',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#4b5563'
    }
  }
};

const applyThemeVariables = (root, activeTheme) => {
  Object.entries(activeTheme.colors).forEach(([token, value]) => {
    const cssVarName = `--mosaic-color-${token.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
    root.style.setProperty(cssVarName, value);
  });
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check localStorage or default to light mode
  const [themeName, setThemeName] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  const theme = themes[themeName] || themes.light;
  const isDarkMode = themeName === 'dark';

  // Apply token CSS variables globally and persist the selected theme.
  useEffect(() => {
    const root = document.documentElement;
    applyThemeVariables(root, theme);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }, [theme, themeName]);

  const toggleTheme = () => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme,
        themeName,
        setThemeName,
        toggleTheme,
        themes
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
