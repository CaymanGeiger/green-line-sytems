import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { enforceMutationProtection, jsonError } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";

function toSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "organization";
}

function getDefaultOrganizationName(ownerName: string): string {
  const normalizedName = ownerName.trim().replace(/\s+/g, " ");
  return normalizedName ? `${normalizedName} Organization` : "My Organization";
}

async function buildUniqueOrganizationSlug(
  tx: Prisma.TransactionClient,
  organizationName: string,
): Promise<string> {
  const base = toSlug(organizationName);

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const exists = await tx.organization.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

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
    const accountType = parsed.data.accountType;
    const name = parsed.data.name.trim();

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: accountType === "OWNER" ? "ADMIN" : "ENGINEER",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (accountType === "OWNER") {
        const organizationName = getDefaultOrganizationName(name);
        const slug = await buildUniqueOrganizationSlug(tx, organizationName);
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
          },
          select: {
            id: true,
          },
        });

        await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
            role: "OWNER",
          },
        });
      }

      return createdUser;
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
