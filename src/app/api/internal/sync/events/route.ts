import crypto from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { internalSyncSchema } from "@/lib/validation";

function safeTokenCompare(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-internal-token");
  if (!token || !safeTokenCompare(env.INTERNAL_SYNC_TOKEN, token)) {
    return jsonError("Unauthorized", 401);
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit({
    key: `internal-sync:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return jsonError("Too many requests", 429);
  }

  try {
    const body = await request.json();
    const parsed = internalSyncSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid sync payload", 400);
    }

    let ingestedDeploys = 0;

    for (const deploy of parsed.data.deploys) {
      try {
        await prisma.deployEvent.create({
          data: {
            serviceId: deploy.serviceId,
            environmentId: deploy.environmentId,
            provider: deploy.provider,
            externalId: deploy.externalId,
            commitSha: deploy.commitSha,
            commitMessage: deploy.commitMessage,
            branch: deploy.branch,
            author: deploy.author,
            startedAt: deploy.startedAt ? new Date(deploy.startedAt) : null,
            finishedAt: deploy.finishedAt ? new Date(deploy.finishedAt) : null,
            status: deploy.status,
            url: deploy.url,
          },
        });

        ingestedDeploys += 1;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          deploy.externalId
        ) {
          continue;
        }

        throw error;
      }
    }

    const [errorInsert, logInsert, alertInsert] = await Promise.all([
      parsed.data.errors.length
        ? prisma.errorEvent.createMany({
            data: parsed.data.errors.map((event) => ({
              serviceId: event.serviceId,
              environmentId: event.environmentId,
              provider: event.provider,
              fingerprint: event.fingerprint,
              title: event.title,
              level: event.level,
              firstSeenAt: new Date(event.firstSeenAt),
              lastSeenAt: new Date(event.lastSeenAt),
              occurrences: event.occurrences,
              url: event.url,
              rawJson: toPrismaJson(event.rawJson),
            })),
          })
        : Promise.resolve({ count: 0 }),
      parsed.data.logs.length
        ? prisma.logEvent.createMany({
            data: parsed.data.logs.map((event) => ({
              serviceId: event.serviceId,
              environmentId: event.environmentId,
              level: event.level,
              message: event.message,
              timestamp: new Date(event.timestamp),
              traceId: event.traceId,
              spanId: event.spanId,
              source: event.source,
              rawJson: toPrismaJson(event.rawJson),
            })),
          })
        : Promise.resolve({ count: 0 }),
      parsed.data.alerts.length
        ? prisma.alertEvent.createMany({
            data: parsed.data.alerts.map((event) => ({
              incidentId: event.incidentId,
              serviceId: event.serviceId,
              source: event.source,
              alertKey: event.alertKey,
              title: event.title,
              severity: event.severity,
              triggeredAt: new Date(event.triggeredAt),
              resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : null,
              status: event.status,
              payloadJson: toPrismaJson(event.payloadJson),
            })),
          })
        : Promise.resolve({ count: 0 }),
    ]);

    return jsonOk({
      ingested: {
        deploys: ingestedDeploys,
        errors: errorInsert.count,
        logs: logInsert.count,
        alerts: alertInsert.count,
      },
    });
  } catch (error) {
    console.error("Internal sync error", error);
    return jsonError("Unable to sync events", 500);
  }
}
