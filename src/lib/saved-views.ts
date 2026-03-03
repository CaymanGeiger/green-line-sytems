export type SavedViewOption = {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
};

export function normalizeSavedViewFilters(filtersJson: unknown): Record<string, string | number | boolean> {
  if (!filtersJson || typeof filtersJson !== "object") {
    return {};
  }

  const filters = filtersJson as Record<string, unknown>;
  const normalized: Record<string, string | number | boolean> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
    }
  });

  return normalized;
}

export function toSavedViewOptions(
  savedViews: Array<{ id: string; name: string; filtersJson: unknown }>,
): SavedViewOption[] {
  return savedViews.map((view) => ({
    id: view.id,
    name: view.name,
    filters: normalizeSavedViewFilters(view.filtersJson),
  }));
}

export function selectSavedViewId(
  requestedSavedViewId: string | undefined,
  options: SavedViewOption[],
): string | undefined {
  if (!requestedSavedViewId) {
    return undefined;
  }

  return options.some((option) => option.id === requestedSavedViewId) ? requestedSavedViewId : undefined;
}
