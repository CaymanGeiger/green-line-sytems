import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return jsonOk({ user });
}

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:profile", 60, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request", 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return jsonOk({ user: updated });
  } catch (error) {
    console.error("Profile update error", error);
    return jsonError("Unable to update profile", 500);
  }
}
