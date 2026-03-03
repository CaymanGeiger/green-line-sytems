import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canManageOrganization } from "@/lib/auth/team-access";
import { prisma } from "@/lib/prisma";
import { organizationUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:organizations:update",
    20,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const { organizationId } = await params;
    const allowed = await canManageOrganization(user.id, organizationId);
    if (!allowed) {
      return jsonError("Organization not found", 404);
    }

    const body = await request.json();
    const parsed = organizationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid organization payload", 400);
    }

    const organization = await prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        name: parsed.data.name.trim(),
      },
      select: {
        id: true,
        name: true,
      },
    });

    return jsonOk({ organization });
  } catch (error) {
    console.error("Organization update error", error);
    return jsonError("Unable to update organization", 500);
  }
}
