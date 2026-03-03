import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  extractEmployeeAccessRequestToken,
  parseEmployeeAccessRequestToken,
} from "@/lib/auth/employee-access-request-link";
import { prisma } from "@/lib/prisma";
import { employeeAccessLinkResolveSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:employee-access:resolve",
    30,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const manageableOrganization = await prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      select: {
        id: true,
      },
    });

    if (!manageableOrganization) {
      return jsonError("Only organization owners/admins can use employee invitation links", 403);
    }

    const body = await request.json();
    const parsed = employeeAccessLinkResolveSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid invitation link payload", 400);
    }

    const requestToken = extractEmployeeAccessRequestToken(parsed.data.link);
    if (!requestToken) {
      return jsonError("Invalid invitation link", 400);
    }

    const payload = parseEmployeeAccessRequestToken(requestToken);
    if (!payload) {
      return jsonError("Invitation link is invalid or expired", 400);
    }

    const requestingUser = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        name: true,
        email: true,
      },
    });
    if (!requestingUser || requestingUser.email.toLowerCase() !== payload.email) {
      return jsonError("Invitation link is invalid or expired", 400);
    }

    return jsonOk({
      request: {
        email: payload.email,
        userId: payload.userId,
        requesterName: requestingUser?.name ?? null,
        requesterEmail: requestingUser?.email ?? payload.email,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("Employee access link resolve error", error);
    return jsonError("Unable to resolve invitation link", 500);
  }
}
