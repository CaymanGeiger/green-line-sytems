export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function minutesBetween(start?: Date | null, end?: Date | null): number {
  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function truncate(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

export function parseNumberParam(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function toDateParam(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function contentWidthCh(
  value: string,
  options?: {
    minCh?: number;
    maxCh?: number;
    paddingCh?: number;
  },
): string {
  const minCh = options?.minCh ?? 12;
  const maxCh = options?.maxCh ?? 24;
  const paddingCh = options?.paddingCh ?? 3;
  const length = value.trim().length;
  const total = Math.max(minCh, Math.min(maxCh, length + paddingCh));
  return `${total}ch`;
}
