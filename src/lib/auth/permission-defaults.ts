import type { PermissionActionKey, PermissionResourceKey } from "@/lib/auth/permission-metadata";

export type TeamMembershipRoleKey = "OWNER" | "MEMBER";

export const MEMBER_DEFAULT_PERMISSION_MAP: Partial<
  Record<PermissionResourceKey, Partial<Record<PermissionActionKey, boolean>>>
> = {
  DASHBOARD: {
    VIEW: true,
  },
  INCIDENT: {
    VIEW: true,
  },
  SERVICE: {
    VIEW: true,
  },
  RUNBOOK: {
    VIEW: true,
  },
  POSTMORTEM: {
    VIEW: true,
  },
  ACTION_ITEM: {
    VIEW: true,
  },
  SAVED_VIEW: {
    VIEW: true,
  },
  SIMULATOR: {
    VIEW: true,
  },
  TEAM: {
    VIEW: true,
  },
  TEAM_MEMBER: {
    VIEW: true,
  },
  TEAM_PERMISSION: {
    VIEW: true,
  },
};

export function defaultPermissionByMembershipRole(
  role: TeamMembershipRoleKey,
  resource: PermissionResourceKey,
  action: PermissionActionKey,
): boolean {
  if (role === "OWNER") {
    return true;
  }

  return MEMBER_DEFAULT_PERMISSION_MAP[resource]?.[action] ?? false;
}
