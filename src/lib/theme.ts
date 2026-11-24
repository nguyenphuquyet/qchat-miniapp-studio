/**
 * Theme persistence shared by the studio store and the app bootstrap.
 *
 * The actual palettes live in index.css: `:root[data-theme="dark"]` and
 * `:root[data-theme="light"]`. Keeping these helpers in their own module lets
 * `lib/store.tsx` export components only, which keeps Vite fast refresh happy.
 */
export type Theme = "dark" | "light";

export const THEME_KEY = "qchat.theme";

export function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Applies a theme to <html> and remembers it for the next launch. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

/** Applies the persisted theme before React paints, avoiding a flash. */
export function applyInitialTheme() {
  document.documentElement.dataset.theme = readStoredTheme();
}
