import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
  });

  await prisma.$executeRawUnsafe(
    "UPDATE Incident SET simulated = 1 WHERE title LIKE '%[SIM]%' OR summary LIKE '%[SIM]%';",
  );
  await prisma.$executeRawUnsafe(
    "UPDATE IncidentTimelineEvent SET simulated = 1 WHERE message LIKE '%[SIM]%';",
  );
  await prisma.$executeRawUnsafe(
    "UPDATE DeployEvent SET simulated = 1 WHERE commitMessage LIKE '%[SIM]%' OR externalId LIKE 'sim-%';",
  );
  await prisma.$executeRawUnsafe(
    "UPDATE ErrorEvent SET simulated = 1 WHERE title LIKE '%[SIM]%' OR fingerprint LIKE 'sim-%';",
  );
  await prisma.$executeRawUnsafe(
    "UPDATE LogEvent SET simulated = 1 WHERE message LIKE '%[SIM]%' OR source = 'test-dev-ops';",
  );
  await prisma.$executeRawUnsafe(
    "UPDATE AlertEvent SET simulated = 1 WHERE title LIKE '%[SIM]%' OR alertKey LIKE 'SIM-%';",
  );

  const counts = {
    incidents: await prisma.incident.count({ where: { simulated: true } }),
    logs: await prisma.logEvent.count({ where: { simulated: true } }),
    errors: await prisma.errorEvent.count({ where: { simulated: true } }),
    deploys: await prisma.deployEvent.count({ where: { simulated: true } }),
    alerts: await prisma.alertEvent.count({ where: { simulated: true } }),
  };

  console.info(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Failed to backfill simulated flags", error);
  process.exit(1);
});
