import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { GetStartedSnapshot } from "@/lib/get-started/shared";
import { buildEmployeeAccessRequestShareLink } from "@/lib/auth/employee-access-request-link";

type GetStartedSnapshotRow = {
  hasAdditionalMember: number | boolean;
  hasPendingInvite: number | boolean;
  hasPendingAccessGrant: number | boolean;
  hasIncident: number | boolean;
  hasRunbook: number | boolean;
  hasSimulatorTelemetry: number | boolean;
};

function toBoolean(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1;
}

export async function getGetStartedSnapshot(
  userId: string,
  userEmail: string,
  userRole: "ADMIN" | "IC" | "ENGINEER" | "VIEWER",
  hasManageableOrganization: boolean,
  organizationIds: string[],
  teamIds: string[],
): Promise<GetStartedSnapshot> {
  const now = new Date();
  const normalizedEmail = userEmail.trim().toLowerCase();

  const additionalMemberExistsSql =
    organizationIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "OrganizationMembership" AS om
          WHERE om."organizationId" IN (${Prisma.join(organizationIds)})
            AND om."userId" <> ${userId}
          LIMIT 1
        )`
      : Prisma.sql`0`;

  const pendingInviteExistsSql =
    organizationIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "OrganizationInvite" AS oi
          WHERE oi."organizationId" IN (${Prisma.join(organizationIds)})
            AND oi."consumedAt" IS NULL
            AND oi."expiresAt" > ${now}
          LIMIT 1
        )`
      : normalizedEmail
        ? Prisma.sql`EXISTS (
            SELECT 1
            FROM "OrganizationInvite" AS oi
            WHERE oi."email" = ${normalizedEmail}
              AND oi."consumedAt" IS NULL
              AND oi."expiresAt" > ${now}
            LIMIT 1
          )`
        : Prisma.sql`0`;

  const pendingAccessGrantExistsSql = normalizedEmail
    ? Prisma.sql`EXISTS (
        SELECT 1
        FROM "EmployeeAccessGrantInvite" AS eigi
        WHERE eigi."email" = ${normalizedEmail}
          AND eigi."consumedAt" IS NULL
          AND eigi."expiresAt" > ${now}
        LIMIT 1
      )`
    : Prisma.sql`0`;

  const incidentExistsSql =
    teamIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "Incident" AS i
          WHERE i."teamId" IN (${Prisma.join(teamIds)})
          LIMIT 1
        )`
      : Prisma.sql`0`;

  const runbookExistsSql =
    teamIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "Runbook" AS r
          WHERE r."teamId" IN (${Prisma.join(teamIds)})
          LIMIT 1
        )`
      : Prisma.sql`0`;

  const simulatorTelemetryExistsSql =
    teamIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "LogEvent" AS le
          INNER JOIN "Service" AS s ON s."id" = le."serviceId"
          WHERE le."simulated" = 1
            AND s."teamId" IN (${Prisma.join(teamIds)})
          LIMIT 1
        )`
      : Prisma.sql`0`;

  const [snapshot] = await prisma.$queryRaw<GetStartedSnapshotRow[]>(Prisma.sql`
    SELECT
      ${additionalMemberExistsSql} AS "hasAdditionalMember",
      ${pendingInviteExistsSql} AS "hasPendingInvite",
      ${pendingAccessGrantExistsSql} AS "hasPendingAccessGrant",
      ${incidentExistsSql} AS "hasIncident",
      ${runbookExistsSql} AS "hasRunbook",
      ${simulatorTelemetryExistsSql} AS "hasSimulatorTelemetry"
  `);

  const mode =
    userRole === "ADMIN" || hasManageableOrganization ? "OWNER_SETUP" : "EMPLOYEE_JOIN";
  const employeeAccessRequestLink =
    mode === "EMPLOYEE_JOIN" && normalizedEmail
      ? buildEmployeeAccessRequestShareLink(userId, normalizedEmail)
      : null;

  return {
    mode,
    organizationsCount: organizationIds.length,
    teamsCount: teamIds.length,
    hasAdditionalMember: toBoolean(snapshot?.hasAdditionalMember),
    hasPendingInvite: toBoolean(snapshot?.hasPendingInvite) || toBoolean(snapshot?.hasPendingAccessGrant),
    hasSimulatorTelemetry: toBoolean(snapshot?.hasSimulatorTelemetry),
    hasIncident: toBoolean(snapshot?.hasIncident),
    hasRunbook: toBoolean(snapshot?.hasRunbook),
    employeeAccessRequestLink,
  };
}
