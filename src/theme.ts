export type ColorTheme = "dark" | "light";

const themeStorageKey = "classical-drill:theme:v1";

export function loadTheme(): ColorTheme {
  return localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark";
}

export function applyTheme(theme: ColorTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: ColorTheme): void {
  localStorage.setItem(themeStorageKey, theme);
  applyTheme(theme);
}
