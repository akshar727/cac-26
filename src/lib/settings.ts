export const PASTEL_THEME_STORAGE_KEY = "codely-pastel-theme";

export function loadPastelTheme(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PASTEL_THEME_STORAGE_KEY) === "true";
}

export function savePastelTheme(enabled: boolean): void {
  window.localStorage.setItem(PASTEL_THEME_STORAGE_KEY, String(enabled));
}
