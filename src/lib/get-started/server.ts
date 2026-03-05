import { prisma } from "@/lib/prisma";
import type { GetStartedSnapshot } from "@/lib/get-started/shared";
import { buildEmployeeAccessRequestShareLink } from "@/lib/auth/employee-access-request-link";

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

  const [additionalMember, pendingInvite, pendingAccessGrant, incident, runbook, simulatorLog] = await Promise.all([
      organizationIds.length > 0
        ? prisma.organizationMembership.findFirst({
            where: {
              organizationId: {
                in: organizationIds,
              },
              userId: {
                not: userId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      organizationIds.length > 0
        ? prisma.organizationInvite.findFirst({
            where: {
              organizationId: {
                in: organizationIds,
              },
              consumedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            select: {
              id: true,
            },
          })
        : normalizedEmail
          ? prisma.organizationInvite.findFirst({
              where: {
                email: normalizedEmail,
                consumedAt: null,
                expiresAt: {
                  gt: now,
                },
              },
              select: {
                id: true,
              },
            })
          : Promise.resolve(null),
      normalizedEmail
        ? prisma.employeeAccessGrantInvite.findFirst({
            where: {
              email: normalizedEmail,
              consumedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      teamIds.length > 0
        ? prisma.incident.findFirst({
            where: {
              teamId: {
                in: teamIds,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      teamIds.length > 0
        ? prisma.runbook.findFirst({
            where: {
              teamId: {
                in: teamIds,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      teamIds.length > 0
        ? prisma.logEvent.findFirst({
            where: {
              simulated: true,
              service: {
                teamId: {
                  in: teamIds,
                },
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
  ]);

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
    hasAdditionalMember: Boolean(additionalMember),
    hasPendingInvite: Boolean(pendingInvite) || Boolean(pendingAccessGrant),
    hasSimulatorTelemetry: Boolean(simulatorLog),
    hasIncident: Boolean(incident),
    hasRunbook: Boolean(runbook),
    employeeAccessRequestLink,
  };
}
