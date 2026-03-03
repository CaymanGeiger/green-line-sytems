export const THEME_COOKIE_NAME = "dcc-theme";

export const THEME_VALUES = ["light", "dark"] as const;

export type ThemeMode = (typeof THEME_VALUES)[number];

export function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}
