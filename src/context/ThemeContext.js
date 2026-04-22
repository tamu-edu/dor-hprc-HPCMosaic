import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'theme';
const DEFAULT_THEME_NAME = 'light';

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
      primary: '#500000',
      primaryHover: '#3f0000',
      primaryText: '#ffffff',
      selectedBg: '#dbeafe',
      selectedText: '#1d4ed8',
      icon: '#6b7280',
      iconActive: '#374151',
      warningText: '#500000',
      warningTextSoft: '#fca5a5',
      successText: '#16a34a',
      successBg: '#22c55e',
      successBgHover: '#16a34a',
      cautionText: '#ca8a04',
      cautionBg: '#eab308',
      dangerText: '#dc2626',
      dangerBg: '#ef4444',
      dangerBgHover: '#dc2626',
      alertBg: '#fef2f2',
      alertBorder: '#dc2626',
      alertText: '#991b1b',
      alertTextSecondary: '#b91c1c',
      tooltipBg: '#1f2937',
      tooltipText: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#cccccc',
      disabledBg: '#9ca3af',
      focusRing: 'rgba(37, 99, 235, 0.25)'
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
      primary: '#fca5a5',
      primaryHover: '#f87171',
      primaryText: '#111827',
      selectedBg: 'rgba(37, 99, 235, 0.25)',
      selectedText: '#bfdbfe',
      icon: '#d1d5db',
      iconActive: '#e5e7eb',
      warningText: '#fca5a5',
      warningTextSoft: '#fca5a5',
      successText: '#86efac',
      successBg: '#22c55e',
      successBgHover: '#16a34a',
      cautionText: '#fde047',
      cautionBg: '#eab308',
      dangerText: '#fca5a5',
      dangerBg: '#ef4444',
      dangerBgHover: '#dc2626',
      alertBg: 'rgba(127, 29, 29, 0.2)',
      alertBorder: '#b91c1c',
      alertText: '#fca5a5',
      alertTextSecondary: '#f87171',
      tooltipBg: '#030712',
      tooltipText: '#f9fafb',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#9ca3af',
      disabledBg: '#4b5563',
      focusRing: 'rgba(96, 165, 250, 0.35)'
    }
  }
};

const isThemeName = (themeName) => Object.prototype.hasOwnProperty.call(themes, themeName);

const getStoredThemeName = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(savedTheme) ? savedTheme : DEFAULT_THEME_NAME;
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
  const [themeName, setThemeName] = useState(getStoredThemeName);

  const theme = themes[themeName] || themes.light;
  const isDarkMode = themeName === 'dark';

  // Apply token CSS variables globally and persist the selected theme.
  useEffect(() => {
    const root = document.documentElement;
    applyThemeVariables(root, theme);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }, [theme, themeName]);

  const setTheme = useCallback((nextThemeName) => {
    if (!isThemeName(nextThemeName)) {
      console.warn(`Unknown theme "${nextThemeName}". Falling back to "${DEFAULT_THEME_NAME}".`);
      setThemeName(DEFAULT_THEME_NAME);
      return false;
    }

    setThemeName(nextThemeName);
    return true;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme,
        themeName,
        setTheme,
        setThemeName: setTheme,
        toggleTheme,
        themes
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
