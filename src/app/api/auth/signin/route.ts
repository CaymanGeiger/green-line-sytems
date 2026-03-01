import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:signin", 35, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid credentials", 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const ip = getClientIp(request);

    const emailRate = await checkRateLimit({
      key: `auth:signin:email:${email}`,
      limit: 20,
      windowMs: 300_000,
    });

    if (!emailRate.allowed) {
      return jsonError("Too many requests", 429);
    }

    const ipRate = await checkRateLimit({
      key: `auth:signin:ip:${ip}`,
      limit: 120,
      windowMs: 300_000,
    });

    if (!ipRate.allowed) {
      return jsonError("Too many requests", 429);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return jsonError("Invalid credentials", 401);
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!validPassword) {
      return jsonError("Invalid credentials", 401);
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 },
    );

    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error("Signin error", error);
    return jsonError("Unable to sign in", 500);
  }
}
