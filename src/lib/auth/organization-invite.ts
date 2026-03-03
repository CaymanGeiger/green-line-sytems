import crypto from "node:crypto";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const ORGANIZATION_INVITE_TTL_HOURS = 72;

function getInviteSecret() {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set and at least 32 characters.");
  }

  return secret;
}

export function generateOrganizationInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashOrganizationInviteToken(token: string): string {
  return crypto.createHmac("sha256", getInviteSecret()).update(token).digest("hex");
}

export function getOrganizationInviteExpiryDate(): Date {
  return new Date(Date.now() + ORGANIZATION_INVITE_TTL_HOURS * 60 * 60 * 1000);
}

export async function findActiveOrganizationInviteByRawToken(rawToken: string) {
  const tokenHash = hashOrganizationInviteToken(rawToken);

  return prisma.organizationInvite.findFirst({
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
      organizationId: true,
      expiresAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
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
}
