import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type CheckRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export async function checkRateLimit(options: CheckRateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const rows = await prisma.$queryRaw<Array<{ windowStart: Date | string; count: number }>>`
      INSERT INTO "ApiRateLimitBucket" ("key", "windowStart", "count", "updatedAt")
      VALUES (${options.key}, ${nowIso}, 1, ${nowIso})
      ON CONFLICT("key") DO UPDATE SET
        "windowStart" = CASE
          WHEN (julianday(${nowIso}) - julianday("ApiRateLimitBucket"."windowStart")) * 86400000 >= ${options.windowMs}
            THEN ${nowIso}
          ELSE "ApiRateLimitBucket"."windowStart"
        END,
        "count" = CASE
          WHEN (julianday(${nowIso}) - julianday("ApiRateLimitBucket"."windowStart")) * 86400000 >= ${options.windowMs}
            THEN 1
          ELSE MIN("ApiRateLimitBucket"."count" + 1, ${options.limit + 1})
        END,
        "updatedAt" = ${nowIso}
      RETURNING "windowStart", "count"
    `;

    const row = rows[0];
    if (!row) {
      return {
        allowed: true,
        remaining: options.limit,
        retryAfterMs: 0,
      };
    }

    const windowStart = new Date(row.windowStart);
    const elapsedMs = Math.max(0, now.getTime() - windowStart.getTime());
    const allowed = row.count <= options.limit;

    return {
      allowed,
      remaining: allowed ? Math.max(0, options.limit - row.count) : 0,
      retryAfterMs: allowed ? 0 : Math.max(0, options.windowMs - elapsedMs),
    };
  } catch (error) {
    console.error("Rate limit storage unavailable, allowing request", {
      key: options.key,
      error,
    });

    return {
      allowed: true,
      remaining: options.limit,
      retryAfterMs: 0,
    };
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
