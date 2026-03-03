import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCE_DEFINITIONS } from "@/lib/auth/permission-metadata";
import { prisma } from "@/lib/prisma";
import { teamMemberAddSchema, teamMemberRemoveSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { teamId } = await params;
    const allowed = await canUserPerformTeamAction(user.id, teamId, "TEAM_MEMBER", "VIEW");
    if (!allowed) {
      return jsonError("Team not found", 404);
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        organizationId: true,
        memberships: {
          orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        organization: {
          select: {
            memberships: {
              orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
              select: {
                role: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      return jsonError("Team not found", 404);
    }

    return jsonOk({ team });
  } catch (error) {
    console.error("Team members list error", error);
    return jsonError("Unable to load team members", 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:teams:members:add", 40, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { teamId } = await params;
    const [canCreate, canUpdate] = await Promise.all([
      canUserPerformTeamAction(user.id, teamId, "TEAM_MEMBER", "CREATE"),
      canUserPerformTeamAction(user.id, teamId, "TEAM_MEMBER", "UPDATE"),
    ]);
    if (!canCreate && !canUpdate) {
      return jsonError("Team not found", 404);
    }

    const body = await request.json();
    const parsed = teamMemberAddSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid team member payload", 400);
    }

    const [team, targetUser] = await Promise.all([
      prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: parsed.data.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    if (!team) {
      return jsonError("Team not found", 404);
    }
    if (!targetUser) {
      return jsonError("User not found", 404);
    }

    const organizationMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: team.organizationId,
        },
      },
      select: {
        id: true,
      },
    });
    if (!organizationMembership) {
      return jsonError("User must be an organization member before joining a team", 400);
    }

    const existingMembership = await prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId: targetUser.id,
          teamId,
        },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    if (existingMembership && !canUpdate) {
      return jsonError("Forbidden", 403);
    }
    if (!existingMembership && !canCreate) {
      return jsonError("Forbidden", 403);
    }

    const requestedRole = parsed.data.role;
    const normalizedMembershipRole = requestedRole === "ADMIN" ? "MEMBER" : requestedRole;

    if (existingMembership?.role === "OWNER" && normalizedMembershipRole !== "OWNER") {
      const ownerCount = await prisma.teamMembership.count({
        where: {
          teamId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return jsonError("Cannot demote the last owner", 400);
      }
    }

    const membership = await prisma.$transaction(async (tx) => {
      const updatedMembership = await tx.teamMembership.upsert({
        where: {
          userId_teamId: {
            userId: targetUser.id,
            teamId,
          },
        },
        create: {
          userId: targetUser.id,
          teamId,
          role: normalizedMembershipRole,
        },
        update: {
          role: normalizedMembershipRole,
        },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (requestedRole === "ADMIN") {
        for (const definition of PERMISSION_RESOURCE_DEFINITIONS) {
          for (const action of PERMISSION_ACTIONS) {
            await tx.teamPermission.upsert({
              where: {
                teamId_userId_resource_action: {
                  teamId,
                  userId: targetUser.id,
                  resource: definition.resource,
                  action,
                },
              },
              update: {
                allowed: true,
              },
              create: {
                teamId,
                userId: targetUser.id,
                resource: definition.resource,
                action,
                allowed: true,
              },
            });
          }
        }
      } else if (requestedRole === "MEMBER") {
        const permissionRows = await tx.teamPermission.findMany({
          where: {
            teamId,
            userId: targetUser.id,
          },
          select: {
            allowed: true,
          },
        });

        const totalPermissionCells = PERMISSION_RESOURCE_DEFINITIONS.length * PERMISSION_ACTIONS.length;
        const isFullAccessOverride =
          permissionRows.length === totalPermissionCells &&
          permissionRows.every((row) => row.allowed === true);

        if (isFullAccessOverride) {
          await tx.teamPermission.deleteMany({
            where: {
              teamId,
              userId: targetUser.id,
            },
          });
        }
      }

      return updatedMembership;
    });

    const responseRole = requestedRole === "ADMIN" ? "ADMIN" : membership.role;
    return jsonOk(
      {
        membership: {
          ...membership,
          role: responseRole,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Team member add error", error);
    return jsonError("Unable to add team member", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:teams:members:remove", 40, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { teamId } = await params;
    const allowed = await canUserPerformTeamAction(user.id, teamId, "TEAM_MEMBER", "DELETE");
    if (!allowed) {
      return jsonError("Team not found", 404);
    }

    const body = await request.json();
    const parsed = teamMemberRemoveSchema.safeParse(body);
    if (!parsed.success || !parsed.data.userId) {
      return jsonError("Invalid team member payload", 400);
    }

    const membership = await prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId: parsed.data.userId,
          teamId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return jsonError("Team member not found", 404);
    }

    if (membership.role === "OWNER") {
      const ownerCount = await prisma.teamMembership.count({
        where: {
          teamId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return jsonError("Cannot remove the last owner", 400);
      }
    }

    await prisma.teamMembership.delete({
      where: {
        userId_teamId: {
          userId: parsed.data.userId,
          teamId,
        },
      },
    });

    return jsonOk({ ok: true, removed: "member" });
  } catch (error) {
    console.error("Team member remove error", error);
    return jsonError("Unable to remove team member", 500);
  }
}
