import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError } from "@/lib/api";
import {
  findActiveOrganizationInviteByRawToken,
  hashOrganizationInviteToken,
} from "@/lib/auth/organization-invite";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { teamInviteAcceptSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:team-invite:accept", 20, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = teamInviteAcceptSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid invite payload", 400);
    }

    const passwordIssues = [...validatePasswordPolicy(parsed.data.password).issues];
    if (parsed.data.password !== parsed.data.confirmPassword) {
      passwordIssues.push("Passwords do not match.");
    }

    if (passwordIssues.length > 0) {
      return NextResponse.json(
        {
          error: "Password does not meet policy requirements",
          passwordIssues,
        },
        { status: 400 },
      );
    }

    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit({
      key: `auth:team-invite:accept:ip:${ip}`,
      limit: 12,
      windowMs: 60_000,
    });
    if (!ipLimit.allowed) {
      return jsonError("Too many requests", 429);
    }

    const invite = await findActiveOrganizationInviteByRawToken(parsed.data.token);
    if (!invite) {
      return jsonError("Invite is invalid or expired", 400);
    }

    const existing = await prisma.user.findUnique({
      where: {
        email: invite.email,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return jsonError("Account already exists for this invite email. Sign in instead.", 400);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const tokenHash = hashOrganizationInviteToken(parsed.data.token);

    const user = await prisma.$transaction(async (tx) => {
      const inviteStillActive = await tx.organizationInvite.findFirst({
        where: {
          id: invite.id,
          tokenHash,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          organization: {
            select: {
              teams: {
                orderBy: {
                  name: "asc",
                },
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!inviteStillActive) {
        throw new Error("INVITE_CONSUMED");
      }

      const created = await tx.user.create({
        data: {
          email: inviteStillActive.email,
          name: parsed.data.name.trim(),
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: created.id,
            organizationId: inviteStillActive.organizationId,
          },
        },
        create: {
          userId: created.id,
          organizationId: inviteStillActive.organizationId,
          role: inviteStillActive.role,
        },
        update: {
          role: inviteStillActive.role,
        },
      });

      const defaultTeamId = inviteStillActive.organization.teams[0]?.id ?? null;
      if (defaultTeamId) {
        await tx.teamMembership.upsert({
          where: {
            userId_teamId: {
              userId: created.id,
              teamId: defaultTeamId,
            },
          },
          create: {
            userId: created.id,
            teamId: defaultTeamId,
            role: "MEMBER",
          },
          update: {},
        });
      }

      await tx.organizationInvite.update({
        where: {
          id: inviteStillActive.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return created;
    });

    const { token, expiresAt } = await createSession(user);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 },
    );
    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_CONSUMED") {
      return jsonError("Invite is invalid or expired", 400);
    }

    console.error("Team invite accept error", error);
    return jsonError("Unable to accept invite", 500);
  }
}
