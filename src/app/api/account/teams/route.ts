import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getAccessibleTeams, getManageableOrganizations } from "@/lib/auth/team-access";
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

async function buildUniqueTeamSlug(organizationId: string, name: string): Promise<string> {
  const base = toSlug(name);

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const exists = await prisma.team.findFirst({
      where: {
        organizationId,
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

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const [teams, organizations] = await Promise.all([getAccessibleTeams(user.id), getManageableOrganizations(user.id)]);
    return jsonOk({ teams, organizations });
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
    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid team payload", 400);
    }

    const teamName = parsed.data.name.trim();
    const organizationName = parsed.data.organizationName?.trim() || null;
    const manageableOrganizations = await getManageableOrganizations(user.id);

    const team = await prisma.$transaction(async (tx) => {
      let targetOrganizationId: string | null = null;
      let createdOrganization = false;

      if (manageableOrganizations.length === 0) {
        const orgName = organizationName || `${teamName} Organization`;
        const orgSlug = await buildUniqueOrganizationSlug(orgName);
        const organization = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
          select: {
            id: true,
          },
        });
        await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: "OWNER",
          },
        });
        targetOrganizationId = organization.id;
        createdOrganization = true;
      } else {
        const requestedOrganizationId = parsed.data.organizationId ?? null;
        if (requestedOrganizationId) {
          const allowed = manageableOrganizations.some((organization) => organization.id === requestedOrganizationId);
          if (!allowed) {
            throw new Error("ORG_FORBIDDEN");
          }
          targetOrganizationId = requestedOrganizationId;
        } else {
          targetOrganizationId = manageableOrganizations[0]?.id ?? null;
        }
      }

      if (!targetOrganizationId) {
        throw new Error("ORG_MISSING");
      }

      const slug = await buildUniqueTeamSlug(targetOrganizationId, teamName);
      const created = await tx.team.create({
        data: {
          organizationId: targetOrganizationId,
          name: teamName,
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.teamMembership.create({
        data: {
          userId: user.id,
          teamId: created.id,
          role: "OWNER",
        },
      });

      if (!createdOrganization) {
        await tx.organizationMembership.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: targetOrganizationId,
            },
          },
          create: {
            userId: user.id,
            organizationId: targetOrganizationId,
            role: "ADMIN",
          },
          update: {},
        });
      }

      return created;
    });

    return jsonOk({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORG_FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }

    console.error("Team create error", error);
    return jsonError("Unable to create team", 500);
  }
}
