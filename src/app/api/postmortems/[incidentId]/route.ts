import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { postmortemPutSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ incidentId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { incidentId } = await params;
    const incident = await prisma.incident.findUnique({
      where: {
        id: incidentId,
      },
      select: {
        teamId: true,
      },
    });

    if (!incident) {
      return jsonError("Postmortem not found", 404);
    }

    const canView = await canUserPerformTeamAction(user.id, incident.teamId, "POSTMORTEM", "VIEW");
    if (!canView) {
      return jsonError("Postmortem not found", 404);
    }

    const postmortem = await prisma.postmortem.findUnique({
      where: {
        incidentId,
      },
      include: {
        actionItems: {
          orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        },
      },
    });

    if (!postmortem) {
      return jsonError("Postmortem not found", 404);
    }

    return jsonOk({ postmortem });
  } catch (error) {
    console.error("Postmortem get error", error);
    return jsonError("Unable to load postmortem", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ incidentId: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "postmortems:update", 40, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { incidentId } = await params;
    const body = await request.json();
    const parsed = postmortemPutSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid postmortem payload", 400);
    }

    const incident = await prisma.incident.findUnique({
      where: {
        id: incidentId,
      },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!incident) {
      return jsonError("Incident not found", 404);
    }

    const canUpdate = await canUserPerformTeamAction(user.id, incident.teamId, "POSTMORTEM", "UPDATE");
    if (!canUpdate) {
      return jsonError("Forbidden", 403);
    }

    const postmortem = await prisma.$transaction(async (tx) => {
      const upserted = await tx.postmortem.upsert({
        where: {
          incidentId,
        },
        create: {
          incidentId,
          authorUserId: user.id,
          whatHappened: parsed.data.whatHappened,
          impact: parsed.data.impact,
          rootCause: parsed.data.rootCause,
          detectionGaps: parsed.data.detectionGaps,
          actionItemsSummary: parsed.data.actionItemsSummary,
          followUpBy: parsed.data.followUpBy ? new Date(parsed.data.followUpBy) : null,
        },
        update: {
          authorUserId: user.id,
          whatHappened: parsed.data.whatHappened,
          impact: parsed.data.impact,
          rootCause: parsed.data.rootCause,
          detectionGaps: parsed.data.detectionGaps,
          actionItemsSummary: parsed.data.actionItemsSummary,
          followUpBy: parsed.data.followUpBy ? new Date(parsed.data.followUpBy) : null,
        },
      });

      const existingActionItems = await tx.actionItem.findMany({
        where: {
          postmortemId: upserted.id,
        },
        select: {
          id: true,
        },
      });

      const payloadIds = new Set<string>();

      for (const item of parsed.data.actionItems) {
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;

        if (item.id) {
          payloadIds.add(item.id);
          await tx.actionItem.update({
            where: {
              id: item.id,
            },
            data: {
              title: item.title,
              description: item.description ?? null,
              ownerUserId: item.ownerUserId ?? null,
              dueDate,
              status: item.status,
              priority: item.priority,
            },
          });
        } else {
          const created = await tx.actionItem.create({
            data: {
              postmortemId: upserted.id,
              title: item.title,
              description: item.description ?? null,
              ownerUserId: item.ownerUserId ?? null,
              dueDate,
              status: item.status,
              priority: item.priority,
            },
          });

          payloadIds.add(created.id);
        }
      }

      const existingIds = existingActionItems.map((item) => item.id);
      const toDelete = existingIds.filter((id) => !payloadIds.has(id));

      if (toDelete.length > 0) {
        await tx.actionItem.deleteMany({
          where: {
            id: {
              in: toDelete,
            },
          },
        });
      }

      return tx.postmortem.findUnique({
        where: {
          id: upserted.id,
        },
        include: {
          actionItems: {
            orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
          },
        },
      });
    });

    return jsonOk({ postmortem });
  } catch (error) {
    console.error("Postmortem upsert error", error);
    return jsonError("Unable to save postmortem", 500);
  }
}
