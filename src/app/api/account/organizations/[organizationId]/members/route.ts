import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { env } from "@/lib/env";
import {
  generateOrganizationInviteToken,
  getOrganizationInviteExpiryDate,
  hashOrganizationInviteToken,
} from "@/lib/auth/organization-invite";
import {
  canManageOrganization,
  getOrganizationMembershipRole,
  hasOrganizationAccess,
} from "@/lib/auth/team-access";
import {
  sendOrganizationInviteEmail,
  sendOrganizationMembershipAddedEmail,
} from "@/lib/auth/team-invite-email";
import { prisma } from "@/lib/prisma";
import { organizationMemberAddSchema, organizationMemberRemoveSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:organizations:members:add",
    40,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const { organizationId } = await params;
    const [allowed, actorRole] = await Promise.all([
      canManageOrganization(user.id, organizationId),
      getOrganizationMembershipRole(user.id, organizationId),
    ]);
    if (!allowed) {
      return jsonError("Organization not found", 404);
    }

    const body = await request.json();
    const parsed = organizationMemberAddSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid organization member payload", 400);
    }

    if (parsed.data.role === "ADMIN" && actorRole !== "OWNER") {
      return jsonError("Only Organization Owners can grant Organization Admin", 403);
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (!organization) {
      return jsonError("Organization not found", 404);
    }

    const email = parsed.data.email.toLowerCase();
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
      const existing = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUser.id,
            organizationId,
          },
        },
        select: {
          role: true,
        },
      });

      if (existing?.role === "OWNER" && actorRole !== "OWNER") {
        return jsonError("Only Organization Owners can manage other owners", 403);
      }

      if (existing?.role === "OWNER") {
        const ownerCount = await prisma.organizationMembership.count({
          where: {
            organizationId,
            role: "OWNER",
          },
        });
        if (ownerCount <= 1) {
          return jsonError("Cannot demote the last organization owner", 400);
        }
      }

      if (existing && parsed.data.role === "ADMIN" && actorRole !== "OWNER") {
        return jsonError("Only Organization Owners can grant Organization Admin", 403);
      }

      const membership = await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: targetUser.id,
            organizationId,
          },
        },
        create: {
          userId: targetUser.id,
          organizationId,
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
        await sendOrganizationMembershipAddedEmail({
          to: targetUser.email,
          organizationName: organization.name,
          addedByName: user.name,
          appUrl: env.APP_URL,
        });
      } catch (error) {
        notificationSent = false;
        console.error("Organization membership email error", error);
      }

      return jsonOk({ mode: "membership", membership, notificationSent }, { status: 201 });
    }

    const rawInviteToken = generateOrganizationInviteToken();
    const tokenHash = hashOrganizationInviteToken(rawInviteToken);
    const expiresAt = getOrganizationInviteExpiryDate();

    const invite = await prisma.$transaction(async (tx) => {
      await tx.organizationInvite.updateMany({
        where: {
          organizationId,
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

      return tx.organizationInvite.create({
        data: {
          organizationId,
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
      await sendOrganizationInviteEmail({
        to: email,
        organizationName: organization.name,
        invitedByName: user.name,
        acceptUrl: acceptUrl.toString(),
      });
    } catch (error) {
      await prisma.organizationInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });
      throw error;
    }

    return jsonOk({ mode: "invite", invite }, { status: 201 });
  } catch (error) {
    console.error("Organization member add error", error);
    return jsonError("Unable to add organization member", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:organizations:members:remove",
    40,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const { organizationId } = await params;
    const [allowed, actorRole] = await Promise.all([
      canManageOrganization(user.id, organizationId),
      getOrganizationMembershipRole(user.id, organizationId),
    ]);
    if (!allowed) {
      return jsonError("Organization not found", 404);
    }

    const body = await request.json();
    const parsed = organizationMemberRemoveSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid organization member payload", 400);
    }

    if (parsed.data.inviteId) {
      const invite = await prisma.organizationInvite.findFirst({
        where: {
          id: parsed.data.inviteId,
          organizationId,
          consumedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!invite) {
        return jsonError("Pending invite not found", 404);
      }

      await prisma.organizationInvite.update({
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
      return jsonError("Invalid organization member payload", 400);
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: parsed.data.userId,
          organizationId,
        },
      },
      select: {
        role: true,
      },
    });
    if (!membership) {
      return jsonError("Organization member not found", 404);
    }

    if (membership.role === "OWNER" && actorRole !== "OWNER") {
      return jsonError("Only Organization Owners can remove owners", 403);
    }

    if (membership.role === "OWNER") {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId,
          role: "OWNER",
        },
      });
      if (ownerCount <= 1) {
        return jsonError("Cannot remove the last organization owner", 400);
      }
    }

    if (parsed.data.userId === user.id && membership.role === "OWNER") {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId,
          role: "OWNER",
        },
      });
      if (ownerCount <= 1) {
        return jsonError("Cannot remove the last organization owner", 400);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMembership.deleteMany({
        where: {
          userId: parsed.data.userId,
          team: {
            organizationId,
          },
        },
      });

      await tx.organizationMembership.delete({
        where: {
          userId_organizationId: {
            userId: parsed.data.userId!,
            organizationId,
          },
        },
      });
    });

    return jsonOk({ ok: true, removed: "member" });
  } catch (error) {
    console.error("Organization member remove error", error);
    return jsonError("Unable to remove organization member", 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { organizationId } = await params;
    const allowed = await hasOrganizationAccess(user.id, organizationId);
    if (!allowed) {
      return jsonError("Organization not found", 404);
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
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
          },
        },
      },
    });

    if (!organization) {
      return jsonError("Organization not found", 404);
    }

    return jsonOk({ organization });
  } catch (error) {
    console.error("Organization members list error", error);
    return jsonError("Unable to load organization members", 500);
  }
}
