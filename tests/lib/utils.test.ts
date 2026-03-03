import { describe, expect, it } from "vitest";

import {
  contentWidthCh,
  formatDateTime,
  minutesBetween,
  parseNumberParam,
  toDateParam,
  truncate,
} from "@/lib/utils";

describe("utils", () => {
  it("formats date values and handles invalid input", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("bad-date")).toBe("-");
    expect(formatDateTime(new Date("2026-03-01T10:00:00.000Z"))).toContain("2026");
  });

  it("computes clamped minute differences", () => {
    const start = new Date("2026-03-01T10:00:00.000Z");
    const end = new Date("2026-03-01T10:30:00.000Z");
    expect(minutesBetween(start, end)).toBe(30);
    expect(minutesBetween(end, start)).toBe(0);
  });

  it("parses and validates number/date params", () => {
    expect(parseNumberParam("10", 3)).toBe(10);
    expect(parseNumberParam("-1", 3)).toBe(3);
    expect(parseNumberParam(undefined, 3)).toBe(3);
    expect(toDateParam("2026-03-01T00:00:00.000Z")?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(toDateParam("bad")).toBeUndefined();
  });

  it("truncates content and computes responsive width", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("short", 10)).toBe("short");
    expect(contentWidthCh("Core Platform", { minCh: 8, maxCh: 20, paddingCh: 2 })).toBe("15ch");
  });
});
