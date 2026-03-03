import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  generateEmployeeAccessGrantToken,
  getEmployeeAccessGrantExpiryDate,
  hashEmployeeAccessGrantToken,
} from "@/lib/auth/employee-access-grant";
import {
  extractEmployeeAccessRequestToken,
  parseEmployeeAccessRequestToken,
} from "@/lib/auth/employee-access-request-link";
import { sendEmployeeAccessVerificationEmail } from "@/lib/auth/team-invite-email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { employeeAccessIssueSchema } from "@/lib/validation";

type OrgAssignment = {
  organizationId: string;
  role: "MEMBER" | "ADMIN";
};

type TeamAssignment = {
  teamId: string;
  role: "MEMBER" | "ADMIN";
};

type AssignmentPayload = {
  organizations: OrgAssignment[];
  teams: TeamAssignment[];
};

function roleRank(role: "MEMBER" | "ADMIN") {
  return role === "ADMIN" ? 2 : 1;
}

function dedupeOrganizations(assignments: OrgAssignment[]): OrgAssignment[] {
  const byOrganizationId = new Map<string, OrgAssignment>();

  assignments.forEach((assignment) => {
    const existing = byOrganizationId.get(assignment.organizationId);
    if (!existing || roleRank(assignment.role) > roleRank(existing.role)) {
      byOrganizationId.set(assignment.organizationId, assignment);
    }
  });

  return [...byOrganizationId.values()];
}

function dedupeTeams(assignments: TeamAssignment[]): TeamAssignment[] {
  const byTeamId = new Map<string, TeamAssignment>();

  assignments.forEach((assignment) => {
    const existing = byTeamId.get(assignment.teamId);
    if (!existing || roleRank(assignment.role) > roleRank(existing.role)) {
      byTeamId.set(assignment.teamId, assignment);
    }
  });

  return [...byTeamId.values()];
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:employee-access:issue",
    20,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = employeeAccessIssueSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid invitation setup payload", 400);
    }

    const requestToken = extractEmployeeAccessRequestToken(parsed.data.link);
    if (!requestToken) {
      return jsonError("Invalid invitation link", 400);
    }

    const requestPayload = parseEmployeeAccessRequestToken(requestToken);
    if (!requestPayload) {
      return jsonError("Invitation link is invalid or expired", 400);
    }

    const normalizedOrganizations = dedupeOrganizations(parsed.data.organizations);
    const normalizedTeams = dedupeTeams(parsed.data.teams);
    const selectedOrganizationIds = normalizedOrganizations.map((assignment) => assignment.organizationId);

    const [actorOrganizations, requestUser] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: {
          userId: user.id,
          organizationId: {
            in: selectedOrganizationIds,
          },
          role: {
            in: ["OWNER", "ADMIN"],
          },
        },
        select: {
          organizationId: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: {
          id: requestPayload.userId,
        },
        select: {
          id: true,
          email: true,
        },
      }),
    ]);

    if (actorOrganizations.length !== selectedOrganizationIds.length) {
      return jsonError("You can only assign access within organizations you manage", 403);
    }

    const actorRoleByOrganizationId = new Map(
      actorOrganizations.map((membership) => [membership.organizationId, membership.role] as const),
    );
    const invalidAdminGrants = normalizedOrganizations.some((assignment) => {
      if (assignment.role !== "ADMIN") {
        return false;
      }
      return actorRoleByOrganizationId.get(assignment.organizationId) !== "OWNER";
    });
    if (invalidAdminGrants) {
      return jsonError("Only organization owners can grant organization admin", 403);
    }

    if (!requestUser || requestUser.email.toLowerCase() !== requestPayload.email) {
      return jsonError("Employee account not found for this invitation link", 400);
    }

    const selectedTeamIds = normalizedTeams.map((assignment) => assignment.teamId);
    const teamRecords =
      selectedTeamIds.length > 0
        ? await prisma.team.findMany({
            where: {
              id: {
                in: selectedTeamIds,
              },
              organizationId: {
                in: selectedOrganizationIds,
              },
            },
            select: {
              id: true,
              organizationId: true,
            },
          })
        : [];

    if (teamRecords.length !== selectedTeamIds.length) {
      return jsonError("One or more selected teams are invalid for the chosen organizations", 400);
    }

    const assignments: AssignmentPayload = {
      organizations: normalizedOrganizations,
      teams: normalizedTeams,
    };

    const rawGrantToken = generateEmployeeAccessGrantToken();
    const grantTokenHash = hashEmployeeAccessGrantToken(rawGrantToken);
    const expiresAt = getEmployeeAccessGrantExpiryDate();

    const invite = await prisma.$transaction(async (tx) => {
      await tx.employeeAccessGrantInvite.updateMany({
        where: {
          email: requestPayload.email,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return tx.employeeAccessGrantInvite.create({
        data: {
          email: requestPayload.email,
          tokenHash: grantTokenHash,
          invitedByUserId: user.id,
          assignmentsJson: assignments,
          expiresAt,
        },
        select: {
          id: true,
        },
      });
    });

    const verifyUrl = new URL("/team-invite/verify", env.APP_URL);
    verifyUrl.searchParams.set("token", rawGrantToken);

    let deliveryId = "";
    try {
      deliveryId = await sendEmployeeAccessVerificationEmail({
        to: requestPayload.email,
        invitedByName: user.name,
        verifyUrl: verifyUrl.toString(),
        organizationNames: actorOrganizations.map((membership) => membership.organization.name),
      });
    } catch (emailError) {
      await prisma.employeeAccessGrantInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      throw emailError;
    }

    return jsonOk({
      ok: true,
      email: requestPayload.email,
      deliveryId,
      expiresAt: expiresAt.toISOString(),
      organizations: actorOrganizations.map((membership) => membership.organization.name),
    });
  } catch (error) {
    console.error("Employee access invitation issue error", error);
    return jsonError("Unable to send employee verification email", 500);
  }
}
