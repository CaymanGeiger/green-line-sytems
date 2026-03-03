import { describe, expect, it } from "vitest";

import {
  signUpSchema,
  teamMemberRemoveSchema,
  testDevOpsPresetSchema,
  testDevOpsSimulateSchema,
} from "@/lib/validation";

describe("validation schemas", () => {
  it("validates signup payload", () => {
    const parsed = signUpSchema.safeParse({
      email: "user@example.com",
      name: "Jane Doe",
      password: "Strong@Pass1",
      confirmPassword: "Strong@Pass1",
    });

    expect(parsed.success).toBe(true);
  });

  it("enforces one-of semantics for team member removal", () => {
    expect(
      teamMemberRemoveSchema.safeParse({
        userId: "ckabcdefghijklmnopqrstuv",
        inviteId: "ckbcdefghijklmnopqrstuvw",
      }).success,
    ).toBe(false);

    expect(
      teamMemberRemoveSchema.safeParse({
        userId: "ckabcdefghijklmnopqrstuv",
      }).success,
    ).toBe(true);
  });

  it("applies defaults for simulation payloads", () => {
    const parsed = testDevOpsSimulateSchema.parse({
      serviceId: "ckabcdefghijklmnopqrstuv",
      action: "submit-checkout",
      expectedOutcome: "WARNING",
    });

    expect(parsed.intensity).toBe(3);
    expect(parsed.profile).toBe("SAFE_DEMO");
    expect(parsed.severityOverride).toBe("AUTO");
    expect(parsed.payload).toEqual({});
    expect(parsed.faults).toEqual({
      dbLatencyMultiplier: 1,
      externalApiFailureRate: 0,
      packetLossEnabled: false,
      cpuSaturationEnabled: false,
    });
  });

  it("rejects invalid preset names", () => {
    const parsed = testDevOpsPresetSchema.safeParse({
      teamId: "ckabcdefghijklmnopqrstuv",
      preset: "NOT_REAL",
    });

    expect(parsed.success).toBe(false);
  });
});
