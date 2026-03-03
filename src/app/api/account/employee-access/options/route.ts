import { NextRequest } from "next/server";

import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId: user.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      orderBy: {
        organization: {
          name: "asc",
        },
      },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            teams: {
              orderBy: {
                name: "asc",
              },
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return jsonOk({
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        actorRole: membership.role,
        teams: membership.organization.teams,
      })),
    });
  } catch (error) {
    console.error("Employee access options error", error);
    return jsonError("Unable to load invitation options", 500);
  }
}

