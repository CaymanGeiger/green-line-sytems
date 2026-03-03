import { NextRequest } from "next/server";
import { z } from "zod";

import { enforceMutationProtection, jsonError, jsonOk } from "@/lib/api";
import {
  findActiveEmployeeAccessGrantByRawToken,
  hashEmployeeAccessGrantToken,
} from "@/lib/auth/employee-access-grant";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCE_DEFINITIONS } from "@/lib/auth/permission-metadata";
import { prisma } from "@/lib/prisma";
import { teamInviteVerifyExistingSchema } from "@/lib/validation";

const assignmentsSchema = z.object({
  organizations: z.array(
    z.object({
      organizationId: z.string().cuid(),
      role: z.enum(["MEMBER", "ADMIN"]),
    }),
  ),
  teams: z
    .array(
      z.object({
        teamId: z.string().cuid(),
        role: z.enum(["MEMBER", "ADMIN"]),
      }),
    )
    .default([]),
});

function organizationRoleRank(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role === "OWNER") {
    return 3;
  }
  if (role === "ADMIN") {
    return 2;
  }
  return 1;
}

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(
    request,
    "auth:team-invite:verify-existing",
    20,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = teamInviteVerifyExistingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid invite payload", 400);
    }

    const invite = await findActiveEmployeeAccessGrantByRawToken(parsed.data.token);
    if (!invite) {
      return jsonError("Invite is invalid or expired", 400);
    }

    const parsedAssignments = assignmentsSchema.safeParse(invite.assignmentsJson);
    if (!parsedAssignments.success || parsedAssignments.data.organizations.length === 0) {
      return jsonError("Invite configuration is invalid", 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        email: invite.email,
      },
      select: {
        id: true,
        email: true,
      },
    });
    if (!targetUser) {
      return jsonError("No account found for this invite email", 400);
    }

    const inviteTokenHash = hashEmployeeAccessGrantToken(parsed.data.token);

    await prisma.$transaction(async (tx) => {
      const inviteStillActive = await tx.employeeAccessGrantInvite.findFirst({
        where: {
          id: invite.id,
          tokenHash: inviteTokenHash,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          assignmentsJson: true,
        },
      });
      if (!inviteStillActive) {
        throw new Error("INVITE_CONSUMED");
      }

      const assignments = assignmentsSchema.parse(inviteStillActive.assignmentsJson);
      const organizationIds = assignments.organizations.map((assignment) => assignment.organizationId);
      const teamIds = assignments.teams.map((assignment) => assignment.teamId);

      const teams =
        teamIds.length > 0
          ? await tx.team.findMany({
              where: {
                id: {
                  in: teamIds,
                },
              },
              select: {
                id: true,
                organizationId: true,
              },
            })
          : [];

      if (teams.length !== teamIds.length) {
        throw new Error("INVITE_INVALID_TEAMS");
      }

      const organizationIdSet = new Set(organizationIds);
      if (teams.some((team) => !organizationIdSet.has(team.organizationId))) {
        throw new Error("INVITE_INVALID_TEAMS");
      }

      for (const assignment of assignments.organizations) {
        const existing = await tx.organizationMembership.findUnique({
          where: {
            userId_organizationId: {
              userId: targetUser.id,
              organizationId: assignment.organizationId,
            },
          },
          select: {
            role: true,
          },
        });

        const requestedRole = assignment.role;
        const nextRole =
          existing && organizationRoleRank(existing.role) > organizationRoleRank(requestedRole)
            ? existing.role
            : requestedRole;

        await tx.organizationMembership.upsert({
          where: {
            userId_organizationId: {
              userId: targetUser.id,
              organizationId: assignment.organizationId,
            },
          },
          create: {
            userId: targetUser.id,
            organizationId: assignment.organizationId,
            role: nextRole,
          },
          update: {
            role: nextRole,
          },
        });
      }

      for (const assignment of assignments.teams) {
        const normalizedMembershipRole = "MEMBER";
        const existing = await tx.teamMembership.findUnique({
          where: {
            userId_teamId: {
              userId: targetUser.id,
              teamId: assignment.teamId,
            },
          },
          select: {
            role: true,
          },
        });

        await tx.teamMembership.upsert({
          where: {
            userId_teamId: {
              userId: targetUser.id,
              teamId: assignment.teamId,
            },
          },
          create: {
            userId: targetUser.id,
            teamId: assignment.teamId,
            role: normalizedMembershipRole,
          },
          update: {
            role: existing?.role === "OWNER" ? "OWNER" : normalizedMembershipRole,
          },
        });

        if (assignment.role === "ADMIN") {
          for (const definition of PERMISSION_RESOURCE_DEFINITIONS) {
            for (const action of PERMISSION_ACTIONS) {
              await tx.teamPermission.upsert({
                where: {
                  teamId_userId_resource_action: {
                    teamId: assignment.teamId,
                    userId: targetUser.id,
                    resource: definition.resource,
                    action,
                  },
                },
                update: {
                  allowed: true,
                },
                create: {
                  teamId: assignment.teamId,
                  userId: targetUser.id,
                  resource: definition.resource,
                  action,
                  allowed: true,
                },
              });
            }
          }
        }
      }

      await tx.employeeAccessGrantInvite.update({
        where: {
          id: inviteStillActive.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_CONSUMED") {
      return jsonError("Invite is invalid or expired", 400);
    }
    if (error instanceof Error && error.message === "INVITE_INVALID_TEAMS") {
      return jsonError("Invite team configuration is invalid", 400);
    }

    console.error("Team invite verify existing error", error);
    return jsonError("Unable to verify invite", 500);
  }
}

