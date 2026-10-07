export const PASTEL_THEME_STORAGE_KEY = "codely-pastel-theme";
export const COMFORT_SETTINGS_STORAGE_KEY = "codely-comfort-settings";

export type ComfortSettings = {
  textSize: "normal" | "large";
  hyperlegible: boolean;
  calmMode: boolean;
};

export const defaultComfortSettings: ComfortSettings = {
  textSize: "normal",
  hyperlegible: false,
  calmMode: false,
};

export function loadComfortSettings(): ComfortSettings {
  if (typeof window === "undefined") return defaultComfortSettings;
  try {
    return {
      ...defaultComfortSettings,
      ...JSON.parse(
        window.localStorage.getItem(COMFORT_SETTINGS_STORAGE_KEY) ?? "{}",
      ),
    };
  } catch {
    return defaultComfortSettings;
  }
}

export function saveComfortSettings(settings: ComfortSettings): void {
  window.localStorage.setItem(
    COMFORT_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

export function loadPastelTheme(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PASTEL_THEME_STORAGE_KEY) === "true";
}

export function savePastelTheme(enabled: boolean): void {
  window.localStorage.setItem(PASTEL_THEME_STORAGE_KEY, String(enabled));
}
