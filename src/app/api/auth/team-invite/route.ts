import { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { findActiveInviteByRawToken } from "@/lib/auth/team-invite";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
    if (!token) {
      return jsonError("Invalid invite", 400);
    }

    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit({
      key: `auth:team-invite:lookup:ip:${ip}`,
      limit: 90,
      windowMs: 60_000,
    });
    if (!ipLimit.allowed) {
      return jsonError("Too many requests", 429);
    }

    const tokenLimit = await checkRateLimit({
      key: `auth:team-invite:lookup:token:${token.slice(0, 24)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!tokenLimit.allowed) {
      return jsonError("Too many requests", 429);
    }

    const invite = await findActiveInviteByRawToken(token);
    if (!invite) {
      return jsonError("Invite not found", 404);
    }

    return jsonOk({
      invite: {
        email: invite.email,
        role: invite.role,
        team: invite.team,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Team invite lookup error", error);
    return jsonError("Unable to load invite", 500);
  }
}
