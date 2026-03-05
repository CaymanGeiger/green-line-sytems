import crypto from "node:crypto";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const EMPLOYEE_ACCESS_GRANT_TTL_HOURS = 72;

function getInviteSecret() {
  return env.AUTH_JWT_SECRET;
}

export function generateEmployeeAccessGrantToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashEmployeeAccessGrantToken(token: string): string {
  return crypto.createHmac("sha256", getInviteSecret()).update(token).digest("hex");
}

export function getEmployeeAccessGrantExpiryDate(): Date {
  return new Date(Date.now() + EMPLOYEE_ACCESS_GRANT_TTL_HOURS * 60 * 60 * 1000);
}

export async function findActiveEmployeeAccessGrantByRawToken(rawToken: string) {
  const tokenHash = hashEmployeeAccessGrantToken(rawToken);

  return prisma.employeeAccessGrantInvite.findFirst({
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
      assignmentsJson: true,
      expiresAt: true,
      invitedByUserId: true,
      invitedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}
