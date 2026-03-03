import { describe, expect, it } from "vitest";

import { defaultPermissionByMembershipRole } from "@/lib/auth/permission-defaults";

describe("permission defaults", () => {
  it("grants owners all permissions", () => {
    expect(defaultPermissionByMembershipRole("OWNER", "INCIDENT", "DELETE")).toBe(true);
    expect(defaultPermissionByMembershipRole("OWNER", "TEAM_PERMISSION", "UPDATE")).toBe(true);
  });

  it("grants members read-only defaults", () => {
    expect(defaultPermissionByMembershipRole("MEMBER", "INCIDENT", "VIEW")).toBe(true);
    expect(defaultPermissionByMembershipRole("MEMBER", "INCIDENT", "CREATE")).toBe(false);
    expect(defaultPermissionByMembershipRole("MEMBER", "TEAM", "VIEW")).toBe(true);
    expect(defaultPermissionByMembershipRole("MEMBER", "TEAM", "DELETE")).toBe(false);
  });
});
