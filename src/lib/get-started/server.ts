import { prisma } from "@/lib/prisma";
import type { GetStartedSnapshot } from "@/lib/get-started/shared";
import { buildEmployeeAccessRequestShareLink } from "@/lib/auth/employee-access-request-link";

export async function getGetStartedSnapshot(
  userId: string,
  userRole: "ADMIN" | "IC" | "ENGINEER" | "VIEWER",
  organizationIds: string[],
  teamIds: string[],
): Promise<GetStartedSnapshot> {
  const now = new Date();
  const userForInviteLookup = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

  const [manageableOrgMembership, additionalMember, pendingInvite, pendingAccessGrant, incident, runbook, simulatorLog] =
    await Promise.all([
      organizationIds.length > 0
        ? prisma.organizationMembership.findFirst({
            where: {
              userId,
              organizationId: {
                in: organizationIds,
              },
              role: {
                in: ["OWNER", "ADMIN"],
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
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
        : userForInviteLookup?.email
          ? prisma.organizationInvite.findFirst({
              where: {
                email: userForInviteLookup.email.toLowerCase(),
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
      userForInviteLookup?.email
        ? prisma.employeeAccessGrantInvite.findFirst({
            where: {
              email: userForInviteLookup.email.toLowerCase(),
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
    userRole === "ADMIN" || Boolean(manageableOrgMembership) ? "OWNER_SETUP" : "EMPLOYEE_JOIN";
  const employeeAccessRequestLink =
    mode === "EMPLOYEE_JOIN" && userForInviteLookup?.email
      ? buildEmployeeAccessRequestShareLink(userId, userForInviteLookup.email)
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
