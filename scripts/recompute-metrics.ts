import { prisma } from "./prisma";

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function minutesBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

async function main() {
  const services = await prisma.service.findMany({
    select: {
      id: true,
    },
  });

  const today = startOfUtcDay(new Date());
  const daysBack = 30;

  for (const service of services) {
    for (let offset = 0; offset < daysBack; offset += 1) {
      const dayStart = addDays(today, -offset);
      const dayEnd = addDays(dayStart, 1);

      const [incidentRows, errorCount, deployCount] = await Promise.all([
        prisma.incident.findMany({
          where: {
            serviceId: service.id,
            startedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          select: {
            startedAt: true,
            detectedAt: true,
            acknowledgedAt: true,
            resolvedAt: true,
          },
        }),
        prisma.errorEvent.count({
          where: {
            serviceId: service.id,
            lastSeenAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
        prisma.deployEvent.count({
          where: {
            serviceId: service.id,
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
      ]);

      const mttaRows = incidentRows
        .map((row) => minutesBetween(row.detectedAt, row.acknowledgedAt))
        .filter((value) => value > 0);
      const mttrRows = incidentRows.map((row) => minutesBetween(row.startedAt, row.resolvedAt)).filter((value) => value > 0);

      const mttaMinutes =
        mttaRows.length > 0
          ? Math.round(mttaRows.reduce((sum, value) => sum + value, 0) / mttaRows.length)
          : 0;

      const mttrMinutes =
        mttrRows.length > 0
          ? Math.round(mttrRows.reduce((sum, value) => sum + value, 0) / mttrRows.length)
          : 0;

      await prisma.dailyServiceMetric.upsert({
        where: {
          serviceId_date: {
            serviceId: service.id,
            date: dayStart,
          },
        },
        create: {
          serviceId: service.id,
          date: dayStart,
          incidentCount: incidentRows.length,
          errorCount,
          deployCount,
          mttaMinutes,
          mttrMinutes,
        },
        update: {
          incidentCount: incidentRows.length,
          errorCount,
          deployCount,
          mttaMinutes,
          mttrMinutes,
        },
      });
    }
  }

  const total = await prisma.dailyServiceMetric.count();
  console.info(`Recomputed daily metrics rows: ${total}`);
}

main()
  .catch((error) => {
    console.error("Failed to recompute metrics", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
