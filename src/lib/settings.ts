export const PASTEL_THEME_STORAGE_KEY = "codely-pastel-theme";
export const ACCESSIBILITY_SETTINGS_STORAGE_KEY = "codely-accessibility-settings";

export type AccessibilitySettings = {
  textSize: "normal" | "large";
  hyperlegible: boolean;
  reducedMotion: boolean;
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const defaultAccessibilitySettings: AccessibilitySettings = {
  textSize: "normal",
  hyperlegible: false,
  reducedMotion: prefersReducedMotion(),
};

export function loadAccessibilitySettings(): AccessibilitySettings {
  if (typeof window === "undefined") return defaultAccessibilitySettings;
  try {
    return {
      ...defaultAccessibilitySettings,
      ...JSON.parse(
        window.localStorage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY) ?? "{}",
      ),
    };
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function saveAccessibilitySettings(
  settings: AccessibilitySettings,
): void {
  window.localStorage.setItem(
    ACCESSIBILITY_SETTINGS_STORAGE_KEY,
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

export function loadLessonProgress(lessonId: number): number {
  try {
    const value = Number(
      window.localStorage.getItem(`codely-lesson-progress-${lessonId}`),
    );
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveLessonProgress(lessonId: number, step: number): void {
  try {
    if (step <= loadLessonProgress(lessonId)) return;
    window.localStorage.setItem(
      `codely-lesson-progress-${lessonId}`,
      String(step),
    );
  } catch {}
}

/** Clears the saved progress (and checkmarks) for every lesson. */
export function resetAllLessonProgress(): void {
  try {
    const prefix = "codely-lesson-progress-";
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {}
}
