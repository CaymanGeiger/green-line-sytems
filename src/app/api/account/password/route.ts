import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError, requireApiUser } from "@/lib/api";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { updatePasswordSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:password", 30, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = updatePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request", 400);
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!currentUser) {
      return jsonError("Unauthorized", 401);
    }

    const validCurrentPassword = await verifyPassword(parsed.data.currentPassword, currentUser.passwordHash);
    if (!validCurrentPassword) {
      return jsonError("Current password is incorrect", 400);
    }

    const passwordIssues = [...validatePasswordPolicy(parsed.data.newPassword).issues];
    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
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

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password update error", error);
    return jsonError("Unable to update password", 500);
  }
}
