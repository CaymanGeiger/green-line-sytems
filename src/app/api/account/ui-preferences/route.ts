import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { uiPreferenceUpdateSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:ui-preferences", 180, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = uiPreferenceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request", 400);
    }

    const preference = await prisma.uiPreference.upsert({
      where: {
        userId_preferenceKey: {
          userId: user.id,
          preferenceKey: parsed.data.preferenceKey,
        },
      },
      create: {
        userId: user.id,
        preferenceKey: parsed.data.preferenceKey,
        isOpen: parsed.data.isOpen,
      },
      update: {
        isOpen: parsed.data.isOpen,
      },
      select: {
        preferenceKey: true,
        isOpen: true,
      },
    });

    return jsonOk({ preference });
  } catch (error) {
    console.error("UI preference update error", error);
    return jsonError("Unable to update UI preference", 500);
  }
}
