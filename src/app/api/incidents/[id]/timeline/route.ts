import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { timelineCreateSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "incidents:timeline", 200, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = timelineCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid timeline event payload", 400);
    }

    const incident = await prisma.incident.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        teamId: true,
      },
    });
    if (!incident) {
      return jsonError("Incident not found", 404);
    }

    const canUpdate = await canUserPerformTeamAction(user.id, incident.teamId, "INCIDENT", "UPDATE");
    if (!canUpdate) {
      return jsonError("Forbidden", 403);
    }

    const metadataJson =
      parsed.data.metadataJson === undefined
        ? undefined
        : (parsed.data.metadataJson as Prisma.InputJsonValue);

    const event = await prisma.incidentTimelineEvent.create({
      data: {
        incidentId: id,
        type: parsed.data.type,
        message: parsed.data.message,
        metadataJson,
        createdByUserId: user.id,
      },
    });

    return jsonOk({ event }, { status: 201 });
  } catch (error) {
    console.error("Incident timeline create error", error);
    return jsonError("Unable to add timeline event", 500);
  }
}
