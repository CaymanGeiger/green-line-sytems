import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection, jsonError } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:signup", 20, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid signup payload", 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const passwordIssues = [...validatePasswordPolicy(parsed.data.password).issues];
    if (parsed.data.password !== parsed.data.confirmPassword) {
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

    const ip = getClientIp(request);
    const emailLimit = await checkRateLimit({
      key: `auth:signup:email:${email}:${ip}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!emailLimit.allowed) {
      return jsonError("Too many requests", 429);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return jsonError("Unable to create account", 400);
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name.trim(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error("Signup error", error);
    return jsonError("Unable to create account", 500);
  }
}
