import { NextResponse } from "next/server";

import { assertCsrf } from "@/lib/auth/csrf";
import { getClientIp, checkRateLimit } from "@/lib/auth/rate-limit";
import { getUserFromRawSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function jsonError(message = "Request failed", status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export async function requireApiUser(request: Request) {
  const requestWithCookies = request as Request & {
    cookies?: {
      get: (name: string) => { value: string } | undefined;
    };
  };

  let rawToken = requestWithCookies.cookies?.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const sessionCookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

    if (sessionCookie) {
      const tokenParts = sessionCookie.split("=");
      rawToken = decodeURIComponent(tokenParts.slice(1).join("="));
    }
  }

  const user = await getUserFromRawSessionToken(rawToken ?? null);

  if (!user) {
    return null;
  }

  return user;
}

export async function enforceMutationProtection(
  request: Request,
  keyPrefix: string,
  limit = 60,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  try {
    assertCsrf(request);
  } catch {
    return jsonError("Invalid request", 403);
  }

  const ip = getClientIp(request);
  const result = await checkRateLimit({
    key: `${keyPrefix}:${ip}`,
    limit,
    windowMs,
  });

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": `${retryAfterSeconds}`,
        },
      },
    );
  }

  return null;
}
