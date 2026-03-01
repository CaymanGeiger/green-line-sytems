import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { PASSWORD_RESET_MAX_ATTEMPTS, hashResetCode, isValidResetCodeFormat } from "@/lib/auth/reset";
import { prisma } from "@/lib/prisma";
import { forgotPasswordResetSchema } from "@/lib/validation";

function tooManyRequestsResponse() {
  return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
}

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:forgot-password:reset", 20, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = forgotPasswordResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit({
      key: `auth:forgot-password:reset:ip:${ip}`,
      limit: 25,
      windowMs: 10 * 60_000,
    });

    if (!ipLimit.allowed) {
      return tooManyRequestsResponse();
    }

    const emailLimit = await checkRateLimit({
      key: `auth:forgot-password:reset:email:${parsed.data.email}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });

    if (!emailLimit.allowed) {
      return tooManyRequestsResponse();
    }

    if (!parsed.data.email || !isValidResetCodeFormat(parsed.data.code)) {
      return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });
    }

    if (!parsed.data.password || !parsed.data.confirmPassword) {
      return NextResponse.json({ error: "Password and confirmation are required." }, { status: 400 });
    }

    const passwordIssues = [...validatePasswordPolicy(parsed.data.password).issues];
    if (parsed.data.password !== parsed.data.confirmPassword) {
      passwordIssues.push("Passwords do not match.");
    }

    if (passwordIssues.length > 0) {
      return NextResponse.json(
        {
          error: passwordIssues[0] ?? "Password does not meet policy requirements",
          passwordIssues,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    const resetRow = await prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetRow) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    if (resetRow.codeHash !== hashResetCode(parsed.data.code)) {
      await prisma.passwordResetCode.update({
        where: { id: resetRow.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
        },
      }),
      prisma.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId: user.id,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password reset error", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
