import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { actionItemPatchSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "action-items:update", 120, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = actionItemPatchSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid action item payload", 400);
    }

    const existing = await prisma.actionItem.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        postmortem: {
          select: {
            incident: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return jsonError("Action item not found", 404);
    }

    const canUpdate = await canUserPerformTeamAction(
      user.id,
      existing.postmortem.incident.teamId,
      "ACTION_ITEM",
      "UPDATE",
    );
    if (!canUpdate) {
      return jsonError("Forbidden", 403);
    }

    const actionItem = await prisma.actionItem.update({
      where: {
        id,
      },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? null } : {}),
        ...(parsed.data.ownerUserId !== undefined ? { ownerUserId: parsed.data.ownerUserId ?? null } : {}),
        ...(parsed.data.dueDate !== undefined
          ? {
              dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
            }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
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
      },
    });

    return jsonOk({ actionItem });
  } catch (error) {
    console.error("Action item update error", error);
    return jsonError("Unable to update action item", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "action-items:delete", 60, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const { id } = await params;
    const existing = await prisma.actionItem.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        postmortem: {
          select: {
            incident: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return jsonError("Action item not found", 404);
    }

    const canDelete = await canUserPerformTeamAction(
      user.id,
      existing.postmortem.incident.teamId,
      "ACTION_ITEM",
      "DELETE",
    );
    if (!canDelete) {
      return jsonError("Forbidden", 403);
    }

    const deleted = await prisma.actionItem.deleteMany({
      where: {
        id,
      },
    });

    if (deleted.count === 0) {
      return jsonError("Action item not found", 404);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("Action item delete error", error);
    return jsonError("Unable to delete action item", 500);
  }
}
