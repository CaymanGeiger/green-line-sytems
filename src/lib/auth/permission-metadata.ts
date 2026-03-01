export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE"] as const;

export const PERMISSION_RESOURCE_DEFINITIONS = [
  {
    resource: "DASHBOARD",
    label: "Dashboard",
    description: "KPI dashboard, active incidents, deploys, and error overview.",
  },
  {
    resource: "INCIDENT",
    label: "Incidents",
    description: "Incident list/detail plus timeline and incident state changes.",
  },
  {
    resource: "SERVICE",
    label: "Services",
    description: "Service inventory pages and service-level reliability telemetry.",
  },
  {
    resource: "RUNBOOK",
    label: "Runbooks",
    description: "Runbook library plus create/edit operations.",
  },
  {
    resource: "POSTMORTEM",
    label: "Postmortems",
    description: "Postmortem pages and post-incident write-up updates.",
  },
  {
    resource: "ACTION_ITEM",
    label: "Action Items",
    description: "Action-item workspace create/update/complete/delete actions.",
  },
  {
    resource: "SAVED_VIEW",
    label: "Saved Views",
    description: "Saved filter-view creation, listing, and deletion.",
  },
  {
    resource: "SIMULATOR",
    label: "Failure Simulator",
    description: "Simulator pages plus simulate/preset/recover/purge actions.",
  },
  {
    resource: "TEAM",
    label: "Teams",
    description: "Team-level controls including creating new teams.",
  },
  {
    resource: "TEAM_MEMBER",
    label: "Team Members",
    description: "List/add/remove members and pending invites for a team.",
  },
  {
    resource: "TEAM_PERMISSION",
    label: "Permissions",
    description: "Permission matrix configuration for team members.",
  },
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTIONS)[number];
export type PermissionResourceKey = (typeof PERMISSION_RESOURCE_DEFINITIONS)[number]["resource"];
