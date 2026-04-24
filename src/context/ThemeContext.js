import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo
} from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'theme';
const DEFAULT_THEME_NAME = 'light';

const themes = {
  light: {
    label: 'Light',
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
    label: 'Dark',
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
  },
  darkLavender: {
    label: 'Dark Lavender',
    colors: {
      appBg: '#15121d',
      surfaceBg: '#211c2b',
      surfaceBgHover: '#2c2540',
      textPrimary: '#f5f3ff',
      textSecondary: '#ddd6fe',
      textMuted: '#b4abc8',
      textInverse: '#15121d',
      border: '#3b3353',
      borderStrong: '#51466f',
      tableHeaderBg: '#2a233b',
      link: '#c4b5fd',
      primary: '#c4b5fd',
      primaryHover: '#a78bfa',
      primaryText: '#15121d',
      selectedBg: 'rgba(167, 139, 250, 0.22)',
      selectedText: '#ddd6fe',
      icon: '#d8d0ee',
      iconActive: '#f5f3ff',
      warningText: '#fdba74',
      warningTextSoft: '#fb923c',
      successText: '#bbf7d0',
      successBg: '#34d399',
      successBgHover: '#10b981',
      cautionText: '#fde68a',
      cautionBg: '#f59e0b',
      dangerText: '#fbcfe8',
      dangerBg: '#ec4899',
      dangerBgHover: '#db2777',
      alertBg: 'rgba(236, 72, 153, 0.14)',
      alertBorder: '#f472b6',
      alertText: '#f9a8d4',
      alertTextSecondary: '#f472b6',
      tooltipBg: '#0f0b16',
      tooltipText: '#f5f3ff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#9f96b3',
      disabledBg: '#4b445f',
      focusRing: 'rgba(196, 181, 253, 0.35)'
    }
  },
  darkPink: {
    label: 'Dark Pink',
    colors: {
      appBg: '#1a1423',
      surfaceBg: '#241a30',
      surfaceBgHover: '#31213f',
      textPrimary: '#fdf2f8',
      textSecondary: '#fbcfe8',
      textMuted: '#d8b4c9',
      textInverse: '#1a1423',
      border: '#4a334f',
      borderStrong: '#66435f',
      tableHeaderBg: '#31213f',
      link: '#f9a8d4',
      primary: '#f9a8d4',
      primaryHover: '#f472b6',
      primaryText: '#1a1423',
      selectedBg: 'rgba(244, 114, 182, 0.20)',
      selectedText: '#fbcfe8',
      icon: '#fbcfe8',
      iconActive: '#fdf2f8',
      warningText: '#f9a8d4',
      warningTextSoft: '#f9a8d4',
      successText: '#bbf7d0',
      successBg: '#34d399',
      successBgHover: '#10b981',
      cautionText: '#fce7f3',
      cautionBg: '#f9a8d4',
      dangerText: '#fbcfe8',
      dangerBg: '#db2777',
      dangerBgHover: '#be185d',
      alertBg: 'rgba(190, 24, 93, 0.16)',
      alertBorder: '#ec4899',
      alertText: '#f9a8d4',
      alertTextSecondary: '#f472b6',
      tooltipBg: '#140f1c',
      tooltipText: '#fdf2f8',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#bfa3b8',
      disabledBg: '#5b445a',
      focusRing: 'rgba(249, 168, 212, 0.35)'
    }
  }
};

const isThemeName = (themeName) => Object.prototype.hasOwnProperty.call(themes, themeName);

const themeColorTokens = Array.from(
  new Set(
    Object.values(themes).flatMap((themeDefinition) => Object.keys(themeDefinition.colors))
  )
);

const getCssVariableName = (token) =>
  `--mosaic-color-${token.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const getStorage = () => {
  if (!canUseDOM()) {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Theme storage is unavailable:', error);
    return null;
  }
};

const getStoredThemeName = () => {
  const storage = getStorage();
  const savedTheme = storage?.getItem(THEME_STORAGE_KEY);
  return isThemeName(savedTheme) ? savedTheme : DEFAULT_THEME_NAME;
};

const applyThemeVariables = (root, activeTheme) => {
  themeColorTokens.forEach((token) => {
    const cssVarName = getCssVariableName(token);
    const value = activeTheme.colors[token];

    if (value === undefined) {
      root.style.removeProperty(cssVarName);
      return;
    }

    root.style.setProperty(cssVarName, value);
  });
};

const persistThemeName = (themeName) => {
  const storage = getStorage();
  storage?.setItem(THEME_STORAGE_KEY, themeName);
};

const setThemeAttribute = (root, themeName) => {
  root.setAttribute('data-theme', themeName);
};

const resolveTheme = (themeName) => themes[themeName] || themes[DEFAULT_THEME_NAME];

export const initializeTheme = () => {
  if (!canUseDOM()) {
    return DEFAULT_THEME_NAME;
  }

  const themeName = getStoredThemeName();
  const root = document.documentElement;

  applyThemeVariables(root, resolveTheme(themeName));
  setThemeAttribute(root, themeName);

  return themeName;
};

const useIsomorphicLayoutEffect = canUseDOM() ? useLayoutEffect : useEffect;

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check localStorage or default to the configured default theme.
  const [themeName, setThemeName] = useState(getStoredThemeName);

  const theme = resolveTheme(themeName);

  // Apply token CSS variables globally and persist the selected theme.
  useIsomorphicLayoutEffect(() => {
    if (!canUseDOM()) {
      return;
    }

    const root = document.documentElement;

    applyThemeVariables(root, theme);
    setThemeAttribute(root, themeName);
    persistThemeName(themeName);
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

  const value = useMemo(() => ({
    theme,
    themeName,
    setTheme,
    themes
  }), [theme, themeName, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
