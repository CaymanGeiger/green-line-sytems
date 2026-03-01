import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { incidentPatchSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const teamScope = await prisma.incident.findUnique({
      where: {
        id,
      },
      select: {
        teamId: true,
      },
    });

    if (!teamScope) {
      return jsonError("Incident not found", 404);
    }

    const canView = await canUserPerformTeamAction(user.id, teamScope.teamId, "INCIDENT", "VIEW");
    if (!canView) {
      return jsonError("Incident not found", 404);
    }

    const incident = await prisma.incident.findUnique({
      where: {
        id,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        commanderUser: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        timelineEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },
      },
    });

    if (!incident) {
      return jsonError("Incident not found", 404);
    }

    return jsonOk({ incident });
  } catch (error) {
    console.error("Incident get error", error);
    return jsonError("Unable to load incident", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "incidents:update", 120, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = incidentPatchSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid incident update payload", 400);
    }

    const existing = await prisma.incident.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        teamId: true,
        status: true,
        severity: true,
        incidentKey: true,
      },
    });

    if (!existing) {
      return jsonError("Incident not found", 404);
    }

    const canUpdate = await canUserPerformTeamAction(user.id, existing.teamId, "INCIDENT", "UPDATE");
    if (!canUpdate) {
      return jsonError("Forbidden", 403);
    }

    const statusChanged = parsed.data.status && parsed.data.status !== existing.status;
    const severityChanged = parsed.data.severity && parsed.data.severity !== existing.severity;

    const incident = await prisma.$transaction(async (tx) => {
      const updated = await tx.incident.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(statusChanged && parsed.data.status === "INVESTIGATING"
            ? {
                acknowledgedAt: new Date(),
              }
            : {}),
          ...(statusChanged && parsed.data.status === "RESOLVED"
            ? {
                resolvedAt: parsed.data.resolvedAt ? new Date(parsed.data.resolvedAt) : new Date(),
              }
            : {}),
        },
      });

      if (statusChanged) {
        await tx.incidentTimelineEvent.create({
          data: {
            incidentId: id,
            type: parsed.data.status === "RESOLVED" ? "RESOLVED" : "STATUS_CHANGED",
            message: `Status changed to ${parsed.data.status}`,
            createdByUserId: user.id,
          },
        });
      }

      if (severityChanged) {
        await tx.incidentTimelineEvent.create({
          data: {
            incidentId: id,
            type: "SEVERITY_CHANGED",
            message: `Severity changed to ${parsed.data.severity}`,
            createdByUserId: user.id,
          },
        });
      }

      return updated;
    });

    return jsonOk({ incident });
  } catch (error) {
    console.error("Incident update error", error);
    return jsonError("Unable to update incident", 500);
  }
}
