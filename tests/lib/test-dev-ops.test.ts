import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIMULATION_FAULT_STATE,
  outcomeLabel,
  outcomeTone,
  toSimulatorKind,
} from "@/lib/test-dev-ops";

describe("test-dev-ops helpers", () => {
  it("maps service names/slugs to simulator kinds", () => {
    expect(toSimulatorKind("API Gateway", "gateway")).toBe("API_GATEWAY");
    expect(toSimulatorKind("Auth Service", "auth-service")).toBe("AUTH");
    expect(toSimulatorKind("Checkout Billing", "checkout")).toBe("CHECKOUT");
    expect(toSimulatorKind("Search Engine", "search-svc")).toBe("SEARCH");
    expect(toSimulatorKind("Queue Worker", "worker-queue")).toBe("WORKER");
  });

  it("returns fallback kind for unknown services", () => {
    expect(toSimulatorKind("Mystery Service", "unknown")).toBe("API_GATEWAY");
  });

  it("returns labels and tones for outcomes", () => {
    expect(outcomeLabel("HEALTHY")).toBe("Healthy success");
    expect(outcomeLabel("WARNING")).toBe("Degraded warning");
    expect(outcomeLabel("FAILURE")).toBe("Hard failure");
    expect(outcomeTone("HEALTHY")).toBe("success");
    expect(outcomeTone("WARNING")).toBe("warning");
    expect(outcomeTone("FAILURE")).toBe("critical");
  });

  it("keeps sensible default fault state", () => {
    expect(DEFAULT_SIMULATION_FAULT_STATE).toEqual({
      dbLatencyMultiplier: 1,
      externalApiFailureRate: 0,
      packetLossEnabled: false,
      cpuSaturationEnabled: false,
    });
  });
});
