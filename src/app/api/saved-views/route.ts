import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction, userHasAnyTeamPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { savedViewSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const canView = await userHasAnyTeamPermission(user.id, "SAVED_VIEW", "VIEW");
    if (!canView) {
      return jsonError("Forbidden", 403);
    }

    const savedViews = await prisma.savedView.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return jsonOk({ savedViews });
  } catch (error) {
    console.error("Saved views list error", error);
    return jsonError("Unable to load saved views", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "saved-views:create", 60, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = savedViewSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid saved view payload", 400);
    }

    const payloadTeamId = (() => {
      const value = parsed.data.filtersJson.teamId;
      return typeof value === "string" ? value : null;
    })();

    if (payloadTeamId) {
      const canCreateForTeam = await canUserPerformTeamAction(user.id, payloadTeamId, "SAVED_VIEW", "CREATE");
      if (!canCreateForTeam) {
        return jsonError("Forbidden", 403);
      }
    } else {
      const canCreateAny = await userHasAnyTeamPermission(user.id, "SAVED_VIEW", "CREATE");
      if (!canCreateAny) {
        return jsonError("Forbidden", 403);
      }
    }

    const savedView = await prisma.savedView.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        scope: parsed.data.scope,
        filtersJson: parsed.data.filtersJson as Prisma.InputJsonValue,
      },
    });

    return jsonOk({ savedView }, { status: 201 });
  } catch (error) {
    console.error("Saved view create error", error);
    return jsonError("Unable to save view", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "saved-views:delete", 120, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const canDelete = await userHasAnyTeamPermission(user.id, "SAVED_VIEW", "DELETE");
    if (!canDelete) {
      return jsonError("Forbidden", 403);
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return jsonError("Missing id", 400);
    }

    await prisma.savedView.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("Saved view delete error", error);
    return jsonError("Unable to delete saved view", 500);
  }
}
