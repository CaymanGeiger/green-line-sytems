import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { runbookPatchSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const teamScope = await prisma.runbook.findUnique({
      where: {
        id,
      },
      select: {
        teamId: true,
      },
    });

    if (!teamScope) {
      return jsonError("Runbook not found", 404);
    }

    const canView = await canUserPerformTeamAction(user.id, teamScope.teamId, "RUNBOOK", "VIEW");
    if (!canView) {
      return jsonError("Runbook not found", 404);
    }

    const runbook = await prisma.runbook.findUnique({
      where: {
        id,
      },
      include: {
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
    });

    if (!runbook) {
      return jsonError("Runbook not found", 404);
    }

    return jsonOk({ runbook });
  } catch (error) {
    console.error("Runbook get error", error);
    return jsonError("Unable to load runbook", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "runbooks:update", 80, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = runbookPatchSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid runbook update payload", 400);
    }

    const existingRunbook = await prisma.runbook.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!existingRunbook) {
      return jsonError("Runbook not found", 404);
    }

    const canUpdate = await canUserPerformTeamAction(user.id, existingRunbook.teamId, "RUNBOOK", "UPDATE");
    if (!canUpdate) {
      return jsonError("Forbidden", 403);
    }

    const nextTeamId = parsed.data.teamId ?? existingRunbook.teamId;
    if (nextTeamId !== existingRunbook.teamId) {
      const canCreateInNextTeam = await canUserPerformTeamAction(user.id, nextTeamId, "RUNBOOK", "CREATE");
      if (!canCreateInNextTeam) {
        return jsonError("Forbidden", 403);
      }
    }

    const canReferenceNextTeam = await canUserPerformTeamAction(user.id, nextTeamId, "RUNBOOK", "VIEW");
    if (!canReferenceNextTeam) {
      return jsonError("Forbidden", 403);
    }

    if (parsed.data.serviceId) {
      const linkedService = await prisma.service.findFirst({
        where: {
          id: parsed.data.serviceId,
          teamId: nextTeamId,
        },
        select: {
          id: true,
        },
      });

      if (!linkedService) {
        return jsonError("Invalid service selection", 400);
      }
    }

    const runbook = await prisma.runbook.update({
      where: { id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.slug ? { slug: parsed.data.slug.trim() } : {}),
        ...(parsed.data.markdown ? { markdown: parsed.data.markdown } : {}),
        ...(parsed.data.tags ? { tagsJson: parsed.data.tags } : {}),
        ...(typeof parsed.data.version === "number" ? { version: parsed.data.version } : {}),
        ...(typeof parsed.data.isActive === "boolean" ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.teamId ? { teamId: parsed.data.teamId } : {}),
        ...(parsed.data.serviceId !== undefined ? { serviceId: parsed.data.serviceId } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        version: true,
        isActive: true,
      },
    });

    return jsonOk({ runbook });
  } catch (error) {
    console.error("Runbook update error", error);
    return jsonError("Unable to update runbook", 500);
  }
}
