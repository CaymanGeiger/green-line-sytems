import { describe, expect, it } from "vitest";

import {
  alertSeverityTone,
  computeMttaMinutes,
  computeMttrMinutes,
  incidentSeverityTone,
  incidentStatusTone,
  serviceTierTone,
} from "@/lib/presentation";

describe("presentation mapping", () => {
  it("maps incident severity to tones", () => {
    expect(incidentSeverityTone("SEV1")).toBe("critical");
    expect(incidentSeverityTone("SEV2")).toBe("danger");
    expect(incidentSeverityTone("SEV3")).toBe("warning");
    expect(incidentSeverityTone("SEV4")).toBe("info");
  });

  it("maps status and service tier to tones", () => {
    expect(incidentStatusTone("OPEN")).toBe("open");
    expect(incidentStatusTone("RESOLVED")).toBe("resolved");
    expect(alertSeverityTone("HIGH")).toBe("danger");
    expect(serviceTierTone("MEDIUM")).toBe("warning");
  });

  it("computes mtta/mttr minutes", () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    const end = new Date("2026-03-01T00:12:00.000Z");
    expect(computeMttaMinutes(start, end)).toBe(12);
    expect(computeMttrMinutes(start, end)).toBe(12);
    expect(computeMttaMinutes(null, end)).toBe(0);
  });
});
