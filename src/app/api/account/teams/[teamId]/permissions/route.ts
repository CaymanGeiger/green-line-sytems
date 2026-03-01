import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { teamPermissionsBulkUpdateSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { teamId } = await params;
    const canViewPermissions = await canUserPerformTeamAction(user.id, teamId, "TEAM_PERMISSION", "VIEW");
    if (!canViewPermissions) {
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
      },
    });

    if (!team) {
      return jsonError("Team not found", 404);
    }

    const [memberships, overrides] = await Promise.all([
      prisma.teamMembership.findMany({
        where: {
          teamId,
        },
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.teamPermission.findMany({
        where: {
          teamId,
        },
        select: {
          userId: true,
          resource: true,
          action: true,
          allowed: true,
          updatedAt: true,
        },
      }),
    ]);

    return jsonOk({
      team,
      members: memberships,
      overrides,
    });
  } catch (error) {
    console.error("Team permissions list error", error);
    return jsonError("Unable to load permissions", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:teams:permissions:update", 24, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { teamId } = await params;
    const canUpdatePermissions = await canUserPerformTeamAction(user.id, teamId, "TEAM_PERMISSION", "UPDATE");
    if (!canUpdatePermissions) {
      return jsonError("Team not found", 404);
    }

    const body = await request.json();
    const parsed = teamPermissionsBulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid permissions payload", 400);
    }

    const deduped = new Map<string, (typeof parsed.data.updates)[number]>();
    for (const update of parsed.data.updates) {
      const key = `${update.userId}:${update.resource}:${update.action}`;
      deduped.set(key, update);
    }

    const updates = Array.from(deduped.values());
    if (updates.length === 0) {
      return jsonOk({ ok: true, updated: 0 });
    }

    const targetUserIds = Array.from(new Set(updates.map((update) => update.userId)));

    const memberships = await prisma.teamMembership.findMany({
      where: {
        teamId,
        userId: {
          in: targetUserIds,
        },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    if (memberships.length !== targetUserIds.length) {
      return jsonError("All updates must target active team members", 400);
    }

    const roleByUserId = new Map(memberships.map((membership) => [membership.userId, membership.role]));

    if (
      updates.some((update) => {
        const role = roleByUserId.get(update.userId);
        return role === "OWNER";
      })
    ) {
      return jsonError("Owner permissions are fixed and cannot be overridden", 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.teamPermission.upsert({
          where: {
            teamId_userId_resource_action: {
              teamId,
              userId: update.userId,
              resource: update.resource,
              action: update.action,
            },
          },
          update: {
            allowed: update.allowed,
          },
          create: {
            teamId,
            userId: update.userId,
            resource: update.resource,
            action: update.action,
            allowed: update.allowed,
          },
        });
      }
    });

    return jsonOk({ ok: true, updated: updates.length });
  } catch (error) {
    console.error("Team permissions update error", error);
    return jsonError("Unable to update permissions", 500);
  }
}
