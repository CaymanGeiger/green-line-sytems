import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction, getTeamIdsForPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { runbookCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const allowedTeamIds = await getTeamIdsForPermission(user.id, "RUNBOOK", "VIEW");
    if (allowedTeamIds.length === 0) {
      return jsonOk({ runbooks: [] });
    }

    const { searchParams } = request.nextUrl;
    const requestedTeamId = searchParams.get("teamId") ?? undefined;
    const teamId = requestedTeamId && allowedTeamIds.includes(requestedTeamId) ? requestedTeamId : undefined;
    const serviceId = searchParams.get("serviceId") ?? undefined;
    const tag = searchParams.get("tag")?.trim();

    const runbooks = await prisma.runbook.findMany({
      where: {
        teamId: {
          in: allowedTeamIds,
        },
        ...(teamId ? { teamId } : {}),
        ...(serviceId ? { serviceId } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        version: true,
        isActive: true,
        tagsJson: true,
        updatedAt: true,
        team: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      take: 300,
    });

    const filtered = tag
      ? runbooks.filter((runbook) =>
          Array.isArray(runbook.tagsJson)
            ? runbook.tagsJson.some((entry) => String(entry).toLowerCase() === tag.toLowerCase())
            : false,
        )
      : runbooks;

    return jsonOk({ runbooks: filtered });
  } catch (error) {
    console.error("Runbook list error", error);
    return jsonError("Unable to load runbooks", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "runbooks:create", 50, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = runbookCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid runbook payload", 400);
    }

    const canCreate = await canUserPerformTeamAction(user.id, parsed.data.teamId, "RUNBOOK", "CREATE");
    if (!canCreate) {
      return jsonError("Forbidden", 403);
    }

    if (parsed.data.serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: parsed.data.serviceId,
          teamId: parsed.data.teamId,
        },
        select: {
          id: true,
        },
      });

      if (!service) {
        return jsonError("Invalid service selection", 400);
      }
    }

    const runbook = await prisma.runbook.create({
      data: {
        teamId: parsed.data.teamId,
        serviceId: parsed.data.serviceId,
        title: parsed.data.title.trim(),
        slug: parsed.data.slug.trim(),
        markdown: parsed.data.markdown,
        tagsJson: parsed.data.tags ?? [],
        version: parsed.data.version,
        isActive: parsed.data.isActive,
        createdByUserId: user.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        version: true,
      },
    });

    return jsonOk({ runbook }, { status: 201 });
  } catch (error) {
    console.error("Runbook create error", error);
    return jsonError("Unable to create runbook", 500);
  }
}
