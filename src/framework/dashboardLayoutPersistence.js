import { get_base_url } from "../utils/api_config.js";

const DASHBOARD_LAYOUT_KEY = "dashboard_layout";
const FALLBACK_STORAGE_KEY = "mosaic.dashboard_layout.v1";
const SCHEMA_VERSION = 1;

const getPreferencesUrl = () => `${get_base_url()}/api/get_preferences`;
const savePreferencesUrl = () => `${get_base_url()}/api/save_preferences`;

const getFallbackStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const readFallbackLayout = () => {
  const storage = getFallbackStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to read fallback dashboard layout:", error);
    return null;
  }
};

const writeFallbackLayout = (payload) => {
  const storage = getFallbackStorage();
  if (!storage) return;

  try {
    storage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save fallback dashboard layout:", error);
  }
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export const normalizeDashboardLayout = (layout, validCardNames = null) => {
  if (!Array.isArray(layout)) return [];

  return layout
    .filter((item) => item && item.name)
    .filter((item) => !validCardNames || validCardNames.has(item.name))
    .filter((item) =>
      ["x", "y", "w", "h"].every((field) => isFiniteNumber(item[field]))
    )
    .map((item) => ({
      name: item.name,
      i: item.i || item.name,
      x: Number(item.x),
      y: Number(item.y),
      w: Number(item.w),
      h: Number(item.h),
    }));
};

export const getSavedLayoutItems = (layoutData) => {
  if (Array.isArray(layoutData)) return layoutData;
  if (layoutData && Array.isArray(layoutData[0])) return layoutData[0];
  if (layoutData && Array.isArray(layoutData["0"])) return layoutData["0"];
  return [];
};

export const buildDashboardLayoutPayload = (layout, defaultLayout) => ({
  schemaVersion: SCHEMA_VERSION,
  layout: normalizeDashboardLayout(layout),
  knownDefaultCardNames: normalizeDashboardLayout(defaultLayout).map((item) => item.name),
  savedAt: new Date().toISOString(),
});

export const mergeDashboardLayout = (savedPayload, defaultLayout, validCardNames) => {
  const normalizedDefaults = normalizeDashboardLayout(defaultLayout, validCardNames);

  if (!savedPayload || !Array.isArray(savedPayload.layout)) {
    return normalizedDefaults;
  }

  const savedLayout = normalizeDashboardLayout(savedPayload.layout, validCardNames);
  const savedNames = new Set(savedLayout.map((item) => item.name));
  const knownDefaultNames = new Set(
    Array.isArray(savedPayload.knownDefaultCardNames)
      ? savedPayload.knownDefaultCardNames
      : savedLayout.map((item) => item.name)
  );

  const bottomY = savedLayout.reduce(
    (maxY, item) => Math.max(maxY, Number(item.y) + Number(item.h)),
    0
  );

  let nextY = bottomY;
  const newDefaultCards = normalizedDefaults
    .filter((item) => !savedNames.has(item.name) && !knownDefaultNames.has(item.name))
    .map((item) => {
      const positionedItem = { ...item, y: nextY };
      nextY += item.h;
      return positionedItem;
    });

  return [...savedLayout, ...newDefaultCards];
};

export const loadDashboardLayoutPreference = async () => {
  try {
    const response = await fetch(getPreferencesUrl());
    if (!response.ok) {
      throw new Error(`Preferences request failed with ${response.status}`);
    }

    const data = await response.json();
    return data?.preferences?.[DASHBOARD_LAYOUT_KEY] || null;
  } catch (error) {
    console.warn("Using fallback dashboard layout persistence:", error);
    return readFallbackLayout();
  }
};

export const saveDashboardLayoutPreference = async (layout, defaultLayout) => {
  const payload = buildDashboardLayoutPayload(layout, defaultLayout);

  try {
    const response = await fetch(savePreferencesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [DASHBOARD_LAYOUT_KEY]: payload }),
    });

    if (!response.ok) {
      throw new Error(`Preferences save failed with ${response.status}`);
    }

    writeFallbackLayout(payload);
    return payload;
  } catch (error) {
    console.warn("Saving dashboard layout to fallback storage:", error);
    writeFallbackLayout(payload);
    return payload;
  }
};
