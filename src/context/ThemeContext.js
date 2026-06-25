import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo
} from 'react';
import config from "../../config.yml";

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'theme';
const CARD_FONT_SIZE_STORAGE_KEY = 'cardFontSize';
const FONT_FAMILY_STORAGE_KEY = 'dashboardFontFamily';
const DEFAULT_THEME_NAME = 'dark';
const DEFAULT_CARD_FONT_SIZE = 'normal';
const DEFAULT_FONT_FAMILY_KEY = 'inter';

const FALLBACK_FONT_FAMILIES = {
  inter: {
    label: 'Inter',
    family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
};

const cardFontSizes = {
  small: {
    label: 'Small',
    scale: 0.98
  },
  normal: {
    label: 'Normal',
    scale: 1.08
  },
  large: {
    label: 'Large',
    scale: 1.18
  }
};

const themes = {
  light: {
    label: 'Light',
    colors: {
      appBg: '#f6f7f9',
      bannerColor: '#500000',
      surfaceBg: '#ffffff',
      surfaceBgHover: '#eef1f5',
      textPrimary: '#172033',
      textSecondary: '#4b5565',
      textMuted: '#6b7280',
      textInverse: '#ffffff',
      border: '#d9dee7',
      borderStrong: '#b7c0cf',
      tableHeaderBg: '#edf1f6',
      link: '#003c71',
      primary: '#500000',
      primaryHover: '#6b1116',
      primaryText: '#ffffff',
      selectedBg: 'rgba(80, 0, 0, 0.10)',
      selectedText: '#500000',
      icon: '#536072',
      iconActive: '#172033',
      warningText: '#500000',
      warningTextSoft: '#b45309',
      successText: '#14733f',
      successBg: '#2f8f55',
      successBgHover: '#267747',
      cautionText: '#9a6700',
      cautionBg: '#d99a12',
      dangerText: '#b4232a',
      dangerBg: '#c8373e',
      dangerBgHover: '#a9272e',
      alertBg: '#fef2f2',
      alertBorder: '#c8373e',
      alertText: '#8f171d',
      alertTextSecondary: '#a9272e',
      tooltipBg: '#172033',
      tooltipText: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#8b95a5',
      disabledBg: '#d5dbe4',
      focusRing: 'rgba(80, 0, 0, 0.22)'
    }
  },
  dark: {
    label: 'Dark',
    colors: {
      appBg: '#202020',
      bannerColor: '#1f2933',
      surfaceBg: '#2A2A2A',
      surfaceBgHover: '#333333',
      textPrimary: '#FFFFFF',
      textSecondary: '#D1D1D1',
      textMuted: '#A6A6A6',
      textInverse: '#111827',
      border: '#3E3E3E',
      borderStrong: '#505050',
      tableHeaderBg: '#242424',
      link: '#F3A6A6',
      primary: '#500000',
      primaryHover: '#732F2F',
      primaryText: '#ffffff',
      selectedBg: 'rgba(80, 0, 0, 0.42)',
      selectedText: '#ffffff',
      icon: '#D1D1D1',
      iconActive: '#ffffff',
      warningText: '#F3A6A6',
      warningTextSoft: '#fca5a5',
      successText: '#86efac',
      successBg: '#3F7F33',
      successBgHover: '#4D9D33',
      cautionText: '#F3A316',
      cautionBg: '#D99012',
      dangerText: '#fca5a5',
      dangerBg: '#A83232',
      dangerBgHover: '#C03A3A',
      alertBg: 'rgba(127, 29, 29, 0.2)',
      alertBorder: '#732F2F',
      alertText: '#fca5a5',
      alertTextSecondary: '#f87171',
      tooltipBg: '#151515',
      tooltipText: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
      disabledText: '#888888',
      disabledBg: '#3E3E3E',
      focusRing: 'rgba(115, 47, 47, 0.36)'
    }
  },
  darkLavender: {
    label: 'Dark Lavender',
    colors: {
      appBg: '#15121d',
      bannerColor: '#2b2140',
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
      bannerColor: '#6b1f4a',
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
const isCardFontSizeName = (sizeName) => Object.prototype.hasOwnProperty.call(cardFontSizes, sizeName);

const getConfiguredDashboardFonts = () => (
  config?.development?.dashboard_fonts ||
  config?.production?.dashboard_fonts ||
  {}
);

const normalizeFontFamilies = () => {
  const configuredFonts = getConfiguredDashboardFonts();
  const options = Array.isArray(configuredFonts.options) ? configuredFonts.options : [];
  const normalizedOptions = options.reduce((accumulator, option) => {
    if (!option?.key || !option?.family) {
      return accumulator;
    }

    accumulator[option.key] = {
      label: option.label || option.key,
      family: option.family
    };
    return accumulator;
  }, {});

  return Object.keys(normalizedOptions).length > 0 ? normalizedOptions : FALLBACK_FONT_FAMILIES;
};

const fontFamilies = normalizeFontFamilies();
const configuredDefaultFontFamily = getConfiguredDashboardFonts().default;
const fallbackFontFamily = Object.keys(fontFamilies)[0] || DEFAULT_FONT_FAMILY_KEY;
const DEFAULT_FONT_FAMILY = Object.prototype.hasOwnProperty.call(fontFamilies, configuredDefaultFontFamily)
  ? configuredDefaultFontFamily
  : fallbackFontFamily;
const isFontFamilyName = (fontFamilyName) => Object.prototype.hasOwnProperty.call(fontFamilies, fontFamilyName);

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

const getStoredCardFontSize = () => {
  const storage = getStorage();
  const savedSize = storage?.getItem(CARD_FONT_SIZE_STORAGE_KEY);
  return isCardFontSizeName(savedSize) ? savedSize : DEFAULT_CARD_FONT_SIZE;
};

const getStoredFontFamily = () => {
  const storage = getStorage();
  const savedFontFamily = storage?.getItem(FONT_FAMILY_STORAGE_KEY);
  return isFontFamilyName(savedFontFamily) ? savedFontFamily : DEFAULT_FONT_FAMILY;
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

const persistCardFontSize = (sizeName) => {
  const storage = getStorage();
  storage?.setItem(CARD_FONT_SIZE_STORAGE_KEY, sizeName);
};

const persistFontFamily = (fontFamilyName) => {
  const storage = getStorage();
  storage?.setItem(FONT_FAMILY_STORAGE_KEY, fontFamilyName);
};

const setThemeAttribute = (root, themeName) => {
  root.setAttribute('data-theme', themeName);
};

const resolveTheme = (themeName) => themes[themeName] || themes[DEFAULT_THEME_NAME];
const resolveCardFontSize = (sizeName) => cardFontSizes[sizeName] || cardFontSizes[DEFAULT_CARD_FONT_SIZE];
const resolveFontFamily = (fontFamilyName) => fontFamilies[fontFamilyName] || fontFamilies[DEFAULT_FONT_FAMILY];

const applyCardFontSizeVariables = (root, sizeName) => {
  const fontSize = resolveCardFontSize(sizeName);

  root.style.setProperty('--mosaic-card-font-scale', String(fontSize.scale));
  root.setAttribute('data-card-font-size', sizeName);
};

const applyFontFamilyVariables = (root, fontFamilyName) => {
  const fontFamily = resolveFontFamily(fontFamilyName);

  root.style.setProperty('--mosaic-dashboard-font-family', fontFamily.family);
  root.setAttribute('data-dashboard-font-family', fontFamilyName);
};

export const initializeTheme = () => {
  if (!canUseDOM()) {
    return DEFAULT_THEME_NAME;
  }

  const themeName = getStoredThemeName();
  const cardFontSize = getStoredCardFontSize();
  const fontFamily = getStoredFontFamily();
  const root = document.documentElement;

  applyThemeVariables(root, resolveTheme(themeName));
  applyCardFontSizeVariables(root, cardFontSize);
  applyFontFamilyVariables(root, fontFamily);
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
  const [cardFontSize, setCardFontSizeName] = useState(getStoredCardFontSize);
  const [fontFamily, setFontFamilyName] = useState(getStoredFontFamily);

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

  useIsomorphicLayoutEffect(() => {
    if (!canUseDOM()) {
      return;
    }

    applyCardFontSizeVariables(document.documentElement, cardFontSize);
    persistCardFontSize(cardFontSize);
  }, [cardFontSize]);

  useIsomorphicLayoutEffect(() => {
    if (!canUseDOM()) {
      return;
    }

    applyFontFamilyVariables(document.documentElement, fontFamily);
    persistFontFamily(fontFamily);
  }, [fontFamily]);

  const setTheme = useCallback((nextThemeName) => {
    if (!isThemeName(nextThemeName)) {
      console.warn(`Unknown theme "${nextThemeName}". Falling back to "${DEFAULT_THEME_NAME}".`);
      setThemeName(DEFAULT_THEME_NAME);
      return false;
    }

    setThemeName(nextThemeName);
    return true;
  }, []);

  const setCardFontSize = useCallback((nextSizeName) => {
    if (!isCardFontSizeName(nextSizeName)) {
      console.warn(`Unknown card font size "${nextSizeName}". Falling back to "${DEFAULT_CARD_FONT_SIZE}".`);
      setCardFontSizeName(DEFAULT_CARD_FONT_SIZE);
      return false;
    }

    setCardFontSizeName(nextSizeName);
    return true;
  }, []);

  const setFontFamily = useCallback((nextFontFamilyName) => {
    if (!isFontFamilyName(nextFontFamilyName)) {
      console.warn(`Unknown dashboard font "${nextFontFamilyName}". Falling back to "${DEFAULT_FONT_FAMILY}".`);
      setFontFamilyName(DEFAULT_FONT_FAMILY);
      return false;
    }

    setFontFamilyName(nextFontFamilyName);
    return true;
  }, []);

  const value = useMemo(() => ({
    theme,
    themeName,
    setTheme,
    themes,
    cardFontSize,
    setCardFontSize,
    cardFontSizes,
    fontFamily,
    setFontFamily,
    fontFamilies
  }), [theme, themeName, setTheme, cardFontSize, setCardFontSize, fontFamily, setFontFamily]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
