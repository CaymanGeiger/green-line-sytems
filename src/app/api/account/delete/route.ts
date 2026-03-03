import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError, requireApiUser } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { deleteAccountSchema } from "@/lib/validation";

const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE ACCOUNT";
const DELETED_ACCOUNT_EMAIL = "deleted-account@devops-incident-command-center.local";
const DELETED_ACCOUNT_NAME = "Deleted Account";

type OwnedOrganizationInfo = {
  organizationId: string;
  members: Array<{
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>;
};

function pickReplacementOwner(
  organization: OwnedOrganizationInfo,
  explicitReplacementId: string | undefined,
): string | null {
  if (explicitReplacementId) {
    const explicitMember = organization.members.find((member) => member.userId === explicitReplacementId);
    return explicitMember ? explicitMember.userId : null;
  }

  const existingOwner = organization.members.find((member) => member.role === "OWNER");
  if (existingOwner) {
    return existingOwner.userId;
  }

  return organization.members[0]?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:delete", 5, 15 * 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid account deletion payload", 400);
    }

    if (parsed.data.confirmation !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
      return jsonError("Invalid confirmation phrase", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        passwordHash: true,
        organizationMemberships: {
          where: {
            role: "OWNER",
          },
          select: {
            organizationId: true,
            organization: {
              select: {
                memberships: {
                  where: {
                    userId: {
                      not: user.id,
                    },
                  },
                  select: {
                    userId: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingUser) {
      return jsonError("Unauthorized", 401);
    }

    const passwordValid = await verifyPassword(parsed.data.currentPassword, existingUser.passwordHash);
    if (!passwordValid) {
      return jsonError("Current password is incorrect", 400);
    }

    const ownedOrganizations: OwnedOrganizationInfo[] = existingUser.organizationMemberships.map((membership) => ({
      organizationId: membership.organizationId,
      members: membership.organization.memberships.map((member) => ({
        userId: member.userId,
        role: member.role,
      })),
    }));

    const assignmentsByOrganizationId = new Map<string, string>();
    (parsed.data.transferAssignments ?? []).forEach((assignment) => {
      assignmentsByOrganizationId.set(assignment.organizationId, assignment.replacementUserId);
    });

    const replacementOwnerByOrganizationId = new Map<string, string>();
    if (parsed.data.mode === "TRANSFER") {
      for (const organization of ownedOrganizations) {
        const replacementOwnerId = pickReplacementOwner(
          organization,
          assignmentsByOrganizationId.get(organization.organizationId),
        );

        if (!replacementOwnerId) {
          return jsonError(
            "Assign replacement owners for each organization or choose full delete.",
            400,
          );
        }

        replacementOwnerByOrganizationId.set(organization.organizationId, replacementOwnerId);
      }
    }

    const deletedAccountPasswordHash = await hashPassword(crypto.randomBytes(24).toString("base64url"));

    await prisma.$transaction(async (tx) => {
      if (parsed.data.mode === "FULL_DELETE" && ownedOrganizations.length > 0) {
        await tx.organization.deleteMany({
          where: {
            id: {
              in: ownedOrganizations.map((organization) => organization.organizationId),
            },
          },
        });
      }

      if (parsed.data.mode === "TRANSFER") {
        for (const [organizationId, replacementUserId] of replacementOwnerByOrganizationId.entries()) {
          await tx.organizationMembership.update({
            where: {
              userId_organizationId: {
                userId: replacementUserId,
                organizationId,
              },
            },
            data: {
              role: "OWNER",
            },
          });

          await tx.incident.updateMany({
            where: {
              createdByUserId: user.id,
              team: {
                organizationId,
              },
            },
            data: {
              createdByUserId: replacementUserId,
            },
          });

          await tx.runbook.updateMany({
            where: {
              createdByUserId: user.id,
              team: {
                organizationId,
              },
            },
            data: {
              createdByUserId: replacementUserId,
            },
          });

          await tx.postmortem.updateMany({
            where: {
              authorUserId: user.id,
              incident: {
                team: {
                  organizationId,
                },
              },
            },
            data: {
              authorUserId: replacementUserId,
            },
          });
        }
      }

      const deletedAccountUser = await tx.user.upsert({
        where: {
          email: DELETED_ACCOUNT_EMAIL,
        },
        create: {
          email: DELETED_ACCOUNT_EMAIL,
          name: DELETED_ACCOUNT_NAME,
          role: "VIEWER",
          passwordHash: deletedAccountPasswordHash,
        },
        update: {},
        select: {
          id: true,
        },
      });

      await tx.incident.updateMany({
        where: {
          createdByUserId: user.id,
        },
        data: {
          createdByUserId: deletedAccountUser.id,
        },
      });

      await tx.runbook.updateMany({
        where: {
          createdByUserId: user.id,
        },
        data: {
          createdByUserId: deletedAccountUser.id,
        },
      });

      await tx.postmortem.updateMany({
        where: {
          authorUserId: user.id,
        },
        data: {
          authorUserId: deletedAccountUser.id,
        },
      });

      await tx.user.delete({
        where: {
          id: user.id,
        },
      });
    });

    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    await deleteSessionByToken(sessionToken);

    const response = NextResponse.json({ ok: true }, { status: 200 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Account delete error", error);
    return jsonError("Unable to delete account", 500);
  }
}
