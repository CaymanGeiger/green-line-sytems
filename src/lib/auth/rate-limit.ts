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

  return prisma.$transaction(async (tx) => {
    const existing = await tx.apiRateLimitBucket.findUnique({
      where: { key: options.key },
    });

    if (!existing) {
      await tx.apiRateLimitBucket.create({
        data: {
          key: options.key,
          windowStart: now,
          count: 1,
        },
      });

      return {
        allowed: true,
        remaining: Math.max(0, options.limit - 1),
        retryAfterMs: 0,
      };
    }

    const elapsedMs = now.getTime() - existing.windowStart.getTime();

    if (elapsedMs >= options.windowMs) {
      await tx.apiRateLimitBucket.update({
        where: { key: options.key },
        data: {
          windowStart: now,
          count: 1,
        },
      });

      return {
        allowed: true,
        remaining: Math.max(0, options.limit - 1),
        retryAfterMs: 0,
      };
    }

    if (existing.count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: options.windowMs - elapsedMs,
      };
    }

    const updated = await tx.apiRateLimitBucket.update({
      where: { key: options.key },
      data: {
        count: {
          increment: 1,
        },
      },
      select: {
        count: true,
      },
    });

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - updated.count),
      retryAfterMs: 0,
    };
  });
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
