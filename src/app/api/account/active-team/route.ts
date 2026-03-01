import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { ACTIVE_TEAM_COOKIE_MAX_AGE_SECONDS, ACTIVE_TEAM_COOKIE_NAME } from "@/lib/auth/active-team";
import { hasTeamAccess } from "@/lib/auth/team-access";
import { z } from "zod";

const bodySchema = z.object({
  teamId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "account:active-team:set", 40, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid active team payload", 400);
    }

    const allowed = await hasTeamAccess(user.id, parsed.data.teamId);
    if (!allowed) {
      return jsonError("Team not found", 404);
    }

    const response = jsonOk({ ok: true, activeTeamId: parsed.data.teamId }, { status: 200 });
    response.cookies.set({
      name: ACTIVE_TEAM_COOKIE_NAME,
      value: parsed.data.teamId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACTIVE_TEAM_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Set active team error", error);
    return jsonError("Unable to set active team", 500);
  }
}
