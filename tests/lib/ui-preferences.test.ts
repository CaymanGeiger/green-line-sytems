import { describe, expect, it } from "vitest";

import {
  UI_PREFERENCE_KEY_MAX_LENGTH,
  isValidUiPreferenceKey,
  normalizeAccordionPreferenceKey,
} from "@/lib/ui-preferences";

describe("ui preferences", () => {
  it("normalizes path and key to a predictable value", () => {
    const normalized = normalizeAccordionPreferenceKey("incidents", " Recent Errors ");
    expect(normalized).toBe("accordion:/incidents:recent-errors");
  });

  it("removes invalid characters from keys", () => {
    const normalized = normalizeAccordionPreferenceKey("/dashboard", "Overview ### $$$");
    expect(normalized).toBe("accordion:/dashboard:overview");
  });

  it("truncates very long keys at max length", () => {
    const longKey = "x".repeat(500);
    const normalized = normalizeAccordionPreferenceKey("/dashboard", longKey);
    expect(normalized.length).toBe(UI_PREFERENCE_KEY_MAX_LENGTH);
  });

  it("validates keys correctly", () => {
    expect(isValidUiPreferenceKey("accordion:/incidents:overview")).toBe(true);
    expect(isValidUiPreferenceKey("")).toBe(false);
    expect(isValidUiPreferenceKey("space not allowed")).toBe(false);
    expect(isValidUiPreferenceKey("x".repeat(UI_PREFERENCE_KEY_MAX_LENGTH + 1))).toBe(false);
  });
});
