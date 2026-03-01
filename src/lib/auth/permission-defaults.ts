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
    CREATE: true,
    UPDATE: true,
  },
  SERVICE: {
    VIEW: true,
  },
  RUNBOOK: {
    VIEW: true,
    CREATE: true,
    UPDATE: true,
    DELETE: true,
  },
  POSTMORTEM: {
    VIEW: true,
    CREATE: true,
    UPDATE: true,
    DELETE: true,
  },
  ACTION_ITEM: {
    VIEW: true,
    CREATE: true,
    UPDATE: true,
    DELETE: true,
  },
  SAVED_VIEW: {
    VIEW: true,
    CREATE: true,
    UPDATE: true,
    DELETE: true,
  },
  SIMULATOR: {
    VIEW: true,
    CREATE: true,
    UPDATE: true,
    DELETE: true,
  },
  TEAM: {
    VIEW: true,
  },
  TEAM_MEMBER: {
    VIEW: true,
  },
  TEAM_PERMISSION: {
    VIEW: false,
    CREATE: false,
    UPDATE: false,
    DELETE: false,
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
