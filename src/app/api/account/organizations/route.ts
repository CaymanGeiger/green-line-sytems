import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { organizationCreateSchema } from "@/lib/validation";

function toSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "organization";
}

async function buildUniqueOrganizationSlug(name: string): Promise<string> {
  const base = toSlug(name);

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const exists = await prisma.organization.findUnique({
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
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(
    request,
    "account:organizations:create",
    10,
    60_000,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = organizationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid organization payload", 400);
    }

    const name = parsed.data.name.trim();
    const slug = await buildUniqueOrganizationSlug(name);
    const organization = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name,
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: created.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return created;
    });

    return jsonOk({ organization }, { status: 201 });
  } catch (error) {
    console.error("Organization create error", error);
    return jsonError("Unable to create organization", 500);
  }
}
