import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { userHasAnyTeamPermission } from "@/lib/auth/permissions";
import { getAccessibleTeams } from "@/lib/auth/team-access";
import { prisma } from "@/lib/prisma";
import { createTeamSchema } from "@/lib/validation";

function toSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "team";
}

async function buildUniqueTeamSlug(name: string): Promise<string> {
  const base = toSlug(name);

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const exists = await prisma.team.findUnique({
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

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const teams = await getAccessibleTeams(user.id);
    return jsonOk({ teams });
  } catch (error) {
    console.error("Team list error", error);
    return jsonError("Unable to load teams", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:teams:create", 20, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const membershipCount = await prisma.teamMembership.count({
      where: {
        userId: user.id,
      },
    });
    if (membershipCount > 0) {
      const canCreateTeam = await userHasAnyTeamPermission(user.id, "TEAM", "CREATE");
      if (!canCreateTeam) {
        return jsonError("Forbidden", 403);
      }
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid team payload", 400);
    }

    const name = parsed.data.name.trim();
    const slug = await buildUniqueTeamSlug(name);

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
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

      await tx.teamMembership.create({
        data: {
          userId: user.id,
          teamId: created.id,
          role: "OWNER",
        },
      });

      return created;
    });

    return jsonOk({ team }, { status: 201 });
  } catch (error) {
    console.error("Team create error", error);
    return jsonError("Unable to create team", 500);
  }
}
