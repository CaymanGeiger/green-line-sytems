export const UI_PREFERENCE_KEY_MAX_LENGTH = 160;
export const UI_PREFERENCE_KEY_PATTERN = /^[a-zA-Z0-9:/_-]+$/;

export function normalizeAccordionPreferenceKey(pathname: string, key: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalizedKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const composite = `accordion:${normalizedPath}:${normalizedKey}`;

  if (composite.length > UI_PREFERENCE_KEY_MAX_LENGTH) {
    return composite.slice(0, UI_PREFERENCE_KEY_MAX_LENGTH);
  }

  return composite;
}

export function isValidUiPreferenceKey(value: string): boolean {
  return value.length > 0 && value.length <= UI_PREFERENCE_KEY_MAX_LENGTH && UI_PREFERENCE_KEY_PATTERN.test(value);
}
