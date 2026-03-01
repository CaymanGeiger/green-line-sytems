import { NextRequest, NextResponse } from "next/server";

import { enforceMutationProtection } from "@/lib/api";
import { clearSessionCookie, deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const protectionError = await enforceMutationProtection(request, "auth:signout", 120, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    await deleteSessionByToken(token);

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Signout error", error);
    const response = NextResponse.json({ error: "Unable to sign out" }, { status: 500 });
    clearSessionCookie(response);
    return response;
  }
}
