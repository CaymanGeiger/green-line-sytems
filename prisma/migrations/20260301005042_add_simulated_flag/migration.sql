-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AlertEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT,
    "serviceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "triggeredAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "status" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "payloadJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlertEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AlertEvent" ("alertKey", "createdAt", "id", "incidentId", "payloadJson", "resolvedAt", "serviceId", "severity", "source", "status", "title", "triggeredAt") SELECT "alertKey", "createdAt", "id", "incidentId", "payloadJson", "resolvedAt", "serviceId", "severity", "source", "status", "title", "triggeredAt" FROM "AlertEvent";
DROP TABLE "AlertEvent";
ALTER TABLE "new_AlertEvent" RENAME TO "AlertEvent";
CREATE INDEX "AlertEvent_serviceId_triggeredAt_idx" ON "AlertEvent"("serviceId", "triggeredAt");
CREATE INDEX "AlertEvent_simulated_triggeredAt_idx" ON "AlertEvent"("simulated", "triggeredAt");
CREATE TABLE "new_DeployEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "environmentId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "commitSha" TEXT NOT NULL,
    "commitMessage" TEXT,
    "branch" TEXT,
    "author" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeployEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeployEvent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeployEvent" ("author", "branch", "commitMessage", "commitSha", "createdAt", "environmentId", "externalId", "finishedAt", "id", "provider", "serviceId", "startedAt", "status", "url") SELECT "author", "branch", "commitMessage", "commitSha", "createdAt", "environmentId", "externalId", "finishedAt", "id", "provider", "serviceId", "startedAt", "status", "url" FROM "DeployEvent";
DROP TABLE "DeployEvent";
ALTER TABLE "new_DeployEvent" RENAME TO "DeployEvent";
CREATE UNIQUE INDEX "DeployEvent_externalId_key" ON "DeployEvent"("externalId");
CREATE INDEX "DeployEvent_serviceId_idx" ON "DeployEvent"("serviceId");
CREATE INDEX "DeployEvent_startedAt_idx" ON "DeployEvent"("startedAt");
CREATE INDEX "DeployEvent_status_idx" ON "DeployEvent"("status");
CREATE INDEX "DeployEvent_simulated_idx" ON "DeployEvent"("simulated");
CREATE TABLE "new_ErrorEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "environmentId" TEXT,
    "provider" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "occurrences" INTEGER NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ErrorEvent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ErrorEvent" ("createdAt", "environmentId", "fingerprint", "firstSeenAt", "id", "lastSeenAt", "level", "occurrences", "provider", "rawJson", "serviceId", "title", "url") SELECT "createdAt", "environmentId", "fingerprint", "firstSeenAt", "id", "lastSeenAt", "level", "occurrences", "provider", "rawJson", "serviceId", "title", "url" FROM "ErrorEvent";
DROP TABLE "ErrorEvent";
ALTER TABLE "new_ErrorEvent" RENAME TO "ErrorEvent";
CREATE INDEX "ErrorEvent_serviceId_lastSeenAt_idx" ON "ErrorEvent"("serviceId", "lastSeenAt");
CREATE INDEX "ErrorEvent_simulated_lastSeenAt_idx" ON "ErrorEvent"("simulated", "lastSeenAt");
CREATE TABLE "new_Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "serviceId" TEXT,
    "incidentKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "detectedAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "summary" TEXT,
    "rootCause" TEXT,
    "impact" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "commanderUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incident_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Incident_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Incident_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Incident_commanderUserId_fkey" FOREIGN KEY ("commanderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Incident" ("acknowledgedAt", "commanderUserId", "createdAt", "createdByUserId", "detectedAt", "id", "impact", "incidentKey", "resolvedAt", "rootCause", "serviceId", "severity", "startedAt", "status", "summary", "teamId", "title", "updatedAt") SELECT "acknowledgedAt", "commanderUserId", "createdAt", "createdByUserId", "detectedAt", "id", "impact", "incidentKey", "resolvedAt", "rootCause", "serviceId", "severity", "startedAt", "status", "summary", "teamId", "title", "updatedAt" FROM "Incident";
DROP TABLE "Incident";
ALTER TABLE "new_Incident" RENAME TO "Incident";
CREATE UNIQUE INDEX "Incident_incidentKey_key" ON "Incident"("incidentKey");
CREATE INDEX "Incident_status_idx" ON "Incident"("status");
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");
CREATE INDEX "Incident_teamId_idx" ON "Incident"("teamId");
CREATE INDEX "Incident_serviceId_idx" ON "Incident"("serviceId");
CREATE INDEX "Incident_simulated_idx" ON "Incident"("simulated");
CREATE TABLE "new_IncidentTimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadataJson" JSONB,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentTimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentTimelineEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IncidentTimelineEvent" ("createdAt", "createdByUserId", "id", "incidentId", "message", "metadataJson", "type") SELECT "createdAt", "createdByUserId", "id", "incidentId", "message", "metadataJson", "type" FROM "IncidentTimelineEvent";
DROP TABLE "IncidentTimelineEvent";
ALTER TABLE "new_IncidentTimelineEvent" RENAME TO "IncidentTimelineEvent";
CREATE INDEX "IncidentTimelineEvent_incidentId_createdAt_idx" ON "IncidentTimelineEvent"("incidentId", "createdAt");
CREATE TABLE "new_LogEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "environmentId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "traceId" TEXT,
    "spanId" TEXT,
    "source" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LogEvent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LogEvent" ("createdAt", "environmentId", "id", "level", "message", "rawJson", "serviceId", "source", "spanId", "timestamp", "traceId") SELECT "createdAt", "environmentId", "id", "level", "message", "rawJson", "serviceId", "source", "spanId", "timestamp", "traceId" FROM "LogEvent";
DROP TABLE "LogEvent";
ALTER TABLE "new_LogEvent" RENAME TO "LogEvent";
CREATE INDEX "LogEvent_serviceId_timestamp_idx" ON "LogEvent"("serviceId", "timestamp");
CREATE INDEX "LogEvent_level_timestamp_idx" ON "LogEvent"("level", "timestamp");
CREATE INDEX "LogEvent_simulated_timestamp_idx" ON "LogEvent"("simulated", "timestamp");

-- Backfill simulator rows into the new simulated flag
UPDATE "Incident" SET "simulated" = true WHERE "title" LIKE '%[SIM]%' OR "summary" LIKE '%[SIM]%';
UPDATE "IncidentTimelineEvent" SET "simulated" = true WHERE "message" LIKE '%[SIM]%';
UPDATE "DeployEvent" SET "simulated" = true WHERE "commitMessage" LIKE '%[SIM]%' OR "externalId" LIKE 'sim-%';
UPDATE "ErrorEvent" SET "simulated" = true WHERE "title" LIKE '%[SIM]%' OR "fingerprint" LIKE 'sim-%';
UPDATE "LogEvent" SET "simulated" = true WHERE "message" LIKE '%[SIM]%' OR "source" = 'test-dev-ops';
UPDATE "AlertEvent" SET "simulated" = true WHERE "title" LIKE '%[SIM]%' OR "alertKey" LIKE 'SIM-%';

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
