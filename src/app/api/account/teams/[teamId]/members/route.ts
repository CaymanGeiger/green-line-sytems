import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import {
  generateTeamInviteToken,
  getTeamInviteExpiryDate,
  hashTeamInviteToken,
} from "@/lib/auth/team-invite";
import { sendTeamInviteEmail, sendTeamMembershipAddedEmail } from "@/lib/auth/team-invite-email";
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
        invites: {
          where: {
            consumedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
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

    const email = parsed.data.email.toLowerCase();
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) {
      return jsonError("Team not found", 404);
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (targetUser) {
      const existingMembership = await prisma.teamMembership.findUnique({
        where: {
          userId_teamId: {
            userId: targetUser.id,
            teamId,
          },
        },
        select: {
          userId: true,
        },
      });

      if (existingMembership && !canUpdate) {
        return jsonError("Forbidden", 403);
      }

      if (!existingMembership && !canCreate) {
        return jsonError("Forbidden", 403);
      }

      const membership = await prisma.teamMembership.upsert({
        where: {
          userId_teamId: {
            userId: targetUser.id,
            teamId,
          },
        },
        create: {
          userId: targetUser.id,
          teamId,
          role: parsed.data.role,
        },
        update: {
          role: parsed.data.role,
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

      let notificationSent = true;
      try {
        await sendTeamMembershipAddedEmail({
          to: targetUser.email,
          teamName: team.name,
          addedByName: user.name,
          appUrl: env.APP_URL,
        });
      } catch (error) {
        notificationSent = false;
        console.error("Team membership email error", error);
      }

      return jsonOk({ mode: "membership", membership, notificationSent }, { status: 201 });
    }

    if (!canCreate) {
      return jsonError("Forbidden", 403);
    }

    const rawInviteToken = generateTeamInviteToken();
    const tokenHash = hashTeamInviteToken(rawInviteToken);
    const expiresAt = getTeamInviteExpiryDate();

    const invite = await prisma.$transaction(async (tx) => {
      await tx.teamInvite.updateMany({
        where: {
          teamId,
          email,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return tx.teamInvite.create({
        data: {
          teamId,
          email,
          role: parsed.data.role,
          tokenHash,
          invitedByUserId: user.id,
          expiresAt,
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });

    const acceptUrl = new URL("/team-invite", env.APP_URL);
    acceptUrl.searchParams.set("token", rawInviteToken);

    try {
      await sendTeamInviteEmail({
        to: email,
        teamName: team.name,
        invitedByName: user.name,
        acceptUrl: acceptUrl.toString(),
      });
    } catch (error) {
      await prisma.teamInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });
      throw error;
    }

    return jsonOk(
      {
        mode: "invite",
        invite,
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
    if (!parsed.success) {
      return jsonError("Invalid team member payload", 400);
    }

    if (parsed.data.inviteId) {
      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: parsed.data.inviteId,
          teamId,
          consumedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!invite) {
        return jsonError("Pending invite not found", 404);
      }

      await prisma.teamInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return jsonOk({ ok: true, removed: "invite" });
    }

    if (!parsed.data.userId) {
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
