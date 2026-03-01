import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { PASSWORD_RESET_MAX_ATTEMPTS, hashResetCode, isValidResetCodeFormat } from "@/lib/auth/reset";
import { prisma } from "@/lib/prisma";

function tooManyRequestsResponse() {
  return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
}

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:forgot-password:verify", 40, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit({
      key: `auth:forgot-password:verify:ip:${ip}`,
      limit: 40,
      windowMs: 10 * 60_000,
    });

    if (!ipLimit.allowed) {
      return tooManyRequestsResponse();
    }

    if (email) {
      const emailLimit = await checkRateLimit({
        key: `auth:forgot-password:verify:email:${email}`,
        limit: 10,
        windowMs: 10 * 60_000,
      });

      if (!emailLimit.allowed) {
        return tooManyRequestsResponse();
      }
    }

    if (!email || !isValidResetCodeFormat(code)) {
      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
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

    if (resetRow.codeHash !== hashResetCode(code)) {
      await prisma.passwordResetCode.update({
        where: { id: resetRow.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password verify error", error);
    return NextResponse.json({ error: "Unable to verify reset code." }, { status: 500 });
  }
}
