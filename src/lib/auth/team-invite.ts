import crypto from "node:crypto";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const TEAM_INVITE_TTL_HOURS = 72;

function getInviteSecret() {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set and at least 32 characters.");
  }

  return secret;
}

export function generateTeamInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashTeamInviteToken(token: string): string {
  return crypto.createHmac("sha256", getInviteSecret()).update(token).digest("hex");
}

export function getTeamInviteExpiryDate(): Date {
  return new Date(Date.now() + TEAM_INVITE_TTL_HOURS * 60 * 60 * 1000);
}

export async function findActiveInviteByRawToken(rawToken: string) {
  const tokenHash = hashTeamInviteToken(rawToken);

  return prisma.teamInvite.findFirst({
    where: {
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
      expiresAt: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}
