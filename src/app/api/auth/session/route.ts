import { NextRequest } from "next/server";

import { jsonOk } from "@/lib/api";
import { getUserFromRawSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromRawSessionToken(token);

  return jsonOk({ user: user ?? null });
}
