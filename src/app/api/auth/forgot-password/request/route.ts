import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection } from "@/lib/api";
import { getClientIp, checkRateLimit } from "@/lib/auth/rate-limit";
import { sendResetCodeEmail } from "@/lib/auth/reset-email";
import { PASSWORD_RESET_TTL_MINUTES, generateResetCode, hashResetCode } from "@/lib/auth/reset";
import { prisma } from "@/lib/prisma";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, a verification code has been sent.",
};

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:forgot-password:request", 30, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const ip = getClientIp(request);

    const ipLimit = await checkRateLimit({
      key: `auth:forgot-password:request:ip:${ip}`,
      limit: 20,
      windowMs: 10 * 60_000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    if (!email) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const emailLimit = await checkRateLimit({
      key: `auth:forgot-password:request:email:${email}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });

    if (!emailLimit.allowed) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const code = generateResetCode();
      const codeHash = hashResetCode(code);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        await tx.passwordResetCode.updateMany({
          where: {
            userId: user.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { consumedAt: new Date() },
        });

        await tx.passwordResetCode.create({
          data: {
            userId: user.id,
            // nonce is retained for schema compatibility but code hashing is keyed-only.
            nonce: "",
            codeHash,
            expiresAt,
          },
        });
      });

      await sendResetCodeEmail({ to: user.email, code });
      return NextResponse.json(GENERIC_RESPONSE);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("Forgot password request error", error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
