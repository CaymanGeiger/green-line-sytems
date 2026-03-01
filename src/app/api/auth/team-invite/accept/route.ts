import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError } from "@/lib/api";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { findActiveInviteByRawToken, hashTeamInviteToken } from "@/lib/auth/team-invite";
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

    const invite = await findActiveInviteByRawToken(parsed.data.token);
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
    const tokenHash = hashTeamInviteToken(parsed.data.token);

    const user = await prisma.$transaction(async (tx) => {
      const inviteStillActive = await tx.teamInvite.findFirst({
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
          teamId: true,
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
        },
      });

      await tx.teamMembership.upsert({
        where: {
          userId_teamId: {
            userId: created.id,
            teamId: inviteStillActive.teamId,
          },
        },
        create: {
          userId: created.id,
          teamId: inviteStillActive.teamId,
          role: inviteStillActive.role,
        },
        update: {
          role: inviteStillActive.role,
        },
      });

      await tx.teamInvite.update({
        where: {
          id: inviteStillActive.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return created;
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
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
