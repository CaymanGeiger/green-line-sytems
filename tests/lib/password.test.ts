import { describe, expect, it } from "vitest";

import {
  PASSWORD_REQUIREMENTS,
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/auth/password";

describe("password policy", () => {
  it("accepts a strong password", () => {
    const result = validatePasswordPolicy("Strong@Pass1");
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("returns all expected issues for weak input", () => {
    const result = validatePasswordPolicy("abc");
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([...PASSWORD_REQUIREMENTS]);
  });

  it("rejects missing uppercase", () => {
    const result = validatePasswordPolicy("lowercase@1");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain(PASSWORD_REQUIREMENTS[1]);
  });

  it("hashes and verifies password", async () => {
    const hash = await hashPassword("Strong@Pass1");
    expect(hash).not.toBe("Strong@Pass1");
    await expect(verifyPassword("Strong@Pass1", hash)).resolves.toBe(true);
    await expect(verifyPassword("Wrong@Pass1", hash)).resolves.toBe(false);
  });
});
