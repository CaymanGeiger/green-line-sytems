import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { actionItemCreateSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "action-items:create", 60, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = actionItemCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid action item payload", 400);
    }

    const postmortem = await prisma.postmortem.findFirst({
      where: {
        id: parsed.data.postmortemId,
      },
      select: {
        id: true,
        incident: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!postmortem) {
      return jsonError("Postmortem not found", 404);
    }

    const canCreate = await canUserPerformTeamAction(user.id, postmortem.incident.teamId, "ACTION_ITEM", "CREATE");
    if (!canCreate) {
      return jsonError("Forbidden", 403);
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        postmortemId: parsed.data.postmortemId,
        title: parsed.data.title.trim(),
        description: parsed.data.description ?? null,
        ownerUserId: parsed.data.ownerUserId ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: parsed.data.status,
        priority: parsed.data.priority,
      },
      select: {
        id: true,
        title: true,
        description: true,
        ownerUserId: true,
        dueDate: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        postmortemId: true,
        ownerUser: {
          select: {
            id: true,
            name: true,
          },
        },
        postmortem: {
          select: {
            incidentId: true,
            incident: {
              select: {
                incidentKey: true,
                title: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return jsonOk({ actionItem }, { status: 201 });
  } catch (error) {
    console.error("Action item create error", error);
    return jsonError("Unable to create action item", 500);
  }
}
