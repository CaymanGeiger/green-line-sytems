import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(80),
  accountType: z.enum(["OWNER", "EMPLOYEE"]).default("OWNER"),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const forgotPasswordResetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const uiPreferenceUpdateSchema = z.object({
  preferenceKey: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-zA-Z0-9:/_-]+$/),
  isOpen: z.boolean(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  organizationId: z.string().cuid().optional().nullable(),
  organizationName: z.string().trim().min(2).max(80).optional().nullable(),
});

export const teamMemberAddSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["OWNER", "MEMBER", "ADMIN"]).default("MEMBER"),
});

export const teamMemberRemoveSchema = z
  .object({
    userId: z.string().cuid().optional(),
    inviteId: z.string().cuid().optional(),
  })
  .refine((value) => Boolean(value.userId) !== Boolean(value.inviteId), {
    message: "Provide exactly one of userId or inviteId.",
  });

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const organizationMemberAddSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export const organizationMemberRemoveSchema = z
  .object({
    userId: z.string().cuid().optional(),
    inviteId: z.string().cuid().optional(),
  })
  .refine((value) => Boolean(value.userId) !== Boolean(value.inviteId), {
    message: "Provide exactly one of userId or inviteId.",
  });

export const employeeAccessLinkResolveSchema = z.object({
  link: z.string().trim().min(16).max(4096),
});

const employeeAccessOrganizationAssignmentSchema = z.object({
  organizationId: z.string().cuid(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

const employeeAccessTeamAssignmentSchema = z.object({
  teamId: z.string().cuid(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export const employeeAccessIssueSchema = z.object({
  link: z.string().trim().min(16).max(4096),
  organizations: z.array(employeeAccessOrganizationAssignmentSchema).min(1).max(25),
  teams: z.array(employeeAccessTeamAssignmentSchema).max(250).default([]),
});

const permissionResourceSchema = z.enum([
  "DASHBOARD",
  "INCIDENT",
  "SERVICE",
  "RUNBOOK",
  "POSTMORTEM",
  "ACTION_ITEM",
  "SAVED_VIEW",
  "SIMULATOR",
  "TEAM",
  "TEAM_MEMBER",
  "TEAM_PERMISSION",
]);

const permissionActionSchema = z.enum(["VIEW", "CREATE", "UPDATE", "DELETE"]);

export const teamPermissionUpdateSchema = z.object({
  userId: z.string().cuid(),
  resource: permissionResourceSchema,
  action: permissionActionSchema,
  allowed: z.boolean(),
});

export const teamPermissionsBulkUpdateSchema = z.object({
  updates: z.array(teamPermissionUpdateSchema).max(5000),
});

export const teamInviteAcceptSchema = z.object({
  token: z.string().trim().min(32).max(256),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export const teamInviteVerifyExistingSchema = z.object({
  token: z.string().trim().min(32).max(256),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export const deleteAccountSchema = z.object({
  mode: z.enum(["TRANSFER", "FULL_DELETE"]),
  currentPassword: z.string().min(1),
  confirmation: z.string().trim().min(1).max(64),
  transferAssignments: z
    .array(
      z.object({
        organizationId: z.string().cuid(),
        replacementUserId: z.string().cuid(),
      }),
    )
    .max(100)
    .optional(),
});

export const incidentCreateSchema = z.object({
  teamId: z.string().cuid(),
  serviceId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(3).max(180),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]),
  summary: z.string().max(2000).optional().nullable(),
  impact: z.string().max(2000).optional().nullable(),
  commanderUserId: z.string().cuid().optional().nullable(),
  startedAt: z.string().datetime().optional(),
});

export const incidentPatchSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "MITIGATED", "RESOLVED"]).optional(),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]).optional(),
  summary: z.string().max(2000).optional(),
  rootCause: z.string().max(4000).optional(),
  impact: z.string().max(2000).optional(),
  commanderUserId: z.string().cuid().nullable().optional(),
  acknowledgedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
});

export const timelineCreateSchema = z.object({
  type: z.enum([
    "CREATED",
    "STATUS_CHANGED",
    "SEVERITY_CHANGED",
    "NOTE",
    "DEPLOY_LINKED",
    "ERROR_SPIKE",
    "MITIGATED",
    "RESOLVED",
  ]),
  message: z.string().trim().min(2).max(2000),
  metadataJson: z.unknown().optional(),
});

export const runbookCreateSchema = z.object({
  teamId: z.string().cuid(),
  serviceId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(3).max(140),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  markdown: z.string().min(10),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
  version: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const runbookPatchSchema = runbookCreateSchema.partial().extend({
  version: z.number().int().min(1).optional(),
});

export const actionItemInputSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().max(1200).optional().nullable(),
  ownerUserId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["P1", "P2", "P3"]),
});

export const actionItemCreateSchema = z.object({
  postmortemId: z.string().cuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().max(1200).optional().nullable(),
  ownerUserId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  priority: z.enum(["P1", "P2", "P3"]).default("P2"),
});

export const actionItemPatchSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().max(1200).optional().nullable(),
    ownerUserId: z.string().cuid().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).optional(),
    priority: z.enum(["P1", "P2", "P3"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const postmortemPutSchema = z.object({
  whatHappened: z.string().min(10).max(10000),
  impact: z.string().min(10).max(8000),
  rootCause: z.string().min(10).max(8000),
  detectionGaps: z.string().min(10).max(8000),
  actionItemsSummary: z.string().min(10).max(8000),
  followUpBy: z.string().datetime().optional().nullable(),
  actionItems: z.array(actionItemInputSchema).max(100),
});

export const savedViewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scope: z.enum(["dashboard", "incidents"]),
  filtersJson: z.record(z.string(), z.unknown()),
});

const deployInputSchema = z.object({
  serviceId: z.string().cuid(),
  environmentId: z.string().cuid().optional().nullable(),
  provider: z.enum(["GITHUB", "GITLAB", "CIRCLECI", "MANUAL"]),
  externalId: z.string().max(120).optional().nullable(),
  commitSha: z.string().min(6).max(64),
  commitMessage: z.string().max(300).optional().nullable(),
  branch: z.string().max(120).optional().nullable(),
  author: z.string().max(120).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  finishedAt: z.string().datetime().optional().nullable(),
  status: z.enum(["STARTED", "SUCCEEDED", "FAILED", "ROLLED_BACK"]),
  url: z.string().url().optional().nullable(),
});

const errorInputSchema = z.object({
  serviceId: z.string().cuid(),
  environmentId: z.string().cuid().optional().nullable(),
  provider: z.enum(["SENTRY", "DATADOG", "ROLLBAR", "MANUAL"]),
  fingerprint: z.string().max(120),
  title: z.string().max(200),
  level: z.enum(["ERROR", "WARNING", "FATAL"]),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  occurrences: z.number().int().min(1),
  url: z.string().url().optional().nullable(),
  rawJson: z.unknown().optional(),
});

const logInputSchema = z.object({
  serviceId: z.string().cuid(),
  environmentId: z.string().cuid().optional().nullable(),
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]),
  message: z.string().min(1).max(400),
  timestamp: z.string().datetime(),
  traceId: z.string().max(120).optional().nullable(),
  spanId: z.string().max(120).optional().nullable(),
  source: z.string().max(120),
  rawJson: z.unknown().optional(),
});

const alertInputSchema = z.object({
  incidentId: z.string().cuid().optional().nullable(),
  serviceId: z.string().cuid(),
  source: z.enum(["DATADOG", "CLOUDWATCH", "PROMETHEUS", "MANUAL"]),
  alertKey: z.string().max(120),
  title: z.string().max(200),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  triggeredAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional().nullable(),
  status: z.enum(["TRIGGERED", "ACKED", "RESOLVED"]),
  payloadJson: z.unknown().optional(),
});

export const internalSyncSchema = z.object({
  deploys: z.array(deployInputSchema).max(1000).default([]),
  errors: z.array(errorInputSchema).max(1000).default([]),
  logs: z.array(logInputSchema).max(5000).default([]),
  alerts: z.array(alertInputSchema).max(1000).default([]),
});

export const testDevOpsFaultSchema = z.object({
  dbLatencyMultiplier: z.number().min(1).max(6).default(1),
  externalApiFailureRate: z.number().min(0).max(100).default(0),
  packetLossEnabled: z.boolean().default(false),
  cpuSaturationEnabled: z.boolean().default(false),
});

export const testDevOpsSimulateSchema = z.object({
  serviceId: z.string().cuid(),
  action: z.string().trim().min(2).max(120),
  expectedOutcome: z.enum(["HEALTHY", "WARNING", "FAILURE"]),
  severityOverride: z.enum(["AUTO", "SEV1", "SEV2", "SEV3", "SEV4"]).default("AUTO"),
  intensity: z.number().int().min(1).max(5).default(3),
  profile: z.enum(["SAFE_DEMO", "HIGH_TRAFFIC", "RELEASE_DAY"]).default("SAFE_DEMO"),
  payload: z.record(z.string(), z.unknown()).default({}),
  faults: testDevOpsFaultSchema.default({
    dbLatencyMultiplier: 1,
    externalApiFailureRate: 0,
    packetLossEnabled: false,
    cpuSaturationEnabled: false,
  }),
});

export const testDevOpsPresetSchema = z.object({
  teamId: z.string().cuid(),
  preset: z.enum([
    "SEV1_CHECKOUT_OUTAGE",
    "LATENCY_DEGRADATION",
    "NOISY_ALERT_FALSE_POSITIVE",
    "ROLLBACK_RECOVERY",
  ]),
  serviceId: z.string().cuid().optional().nullable(),
  profile: z.enum(["SAFE_DEMO", "HIGH_TRAFFIC", "RELEASE_DAY"]).default("SAFE_DEMO"),
  severityOverride: z.enum(["AUTO", "SEV1", "SEV2", "SEV3", "SEV4"]).default("AUTO"),
  faults: testDevOpsFaultSchema.default({
    dbLatencyMultiplier: 1,
    externalApiFailureRate: 0,
    packetLossEnabled: false,
    cpuSaturationEnabled: false,
  }),
});

export const testDevOpsRecoverSchema = z.object({
  teamId: z.string().cuid(),
});

export const testDevOpsPurgeSchema = z.object({
  teamId: z.string().cuid(),
});
