import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import {
  ActionItemPriority,
  ActionItemStatus,
  AlertSeverity,
  AlertSource,
  AlertStatus,
  DeployProvider,
  DeployStatus,
  ErrorLevel,
  ErrorProvider,
  IncidentSeverity,
  IncidentStatus,
  LogLevel,
  ServiceTier,
  TeamMembershipRole,
  TimelineEventType,
  UserRole,
} from "@prisma/client";
import { prisma } from "./prisma";

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function pickWeighted<T>(values: Array<{ value: T; weight: number }>): T {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  let needle = Math.random() * totalWeight;

  for (const entry of values) {
    needle -= entry.weight;
    if (needle <= 0) {
      return entry.value;
    }
  }

  return values[values.length - 1]!.value;
}

function randomDateWithinDays(daysBack: number): Date {
  const now = Date.now();
  const spanMs = daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(Math.random() * spanMs));
}

function randomSha(): string {
  return crypto.randomBytes(20).toString("hex");
}

function randomWords(count: number): string {
  const words = [
    "network",
    "latency",
    "cluster",
    "database",
    "queue",
    "error",
    "retry",
    "capacity",
    "cache",
    "timeout",
    "rollback",
    "pipeline",
    "service",
    "gateway",
    "orchestration",
    "autoscaling",
    "scheduler",
    "throughput",
    "degraded",
    "mitigation",
    "replication",
    "lock",
    "checkpoint",
    "certificate",
    "overload",
  ];

  return Array.from({ length: count })
    .map(() => pick(words))
    .join(" ");
}

async function main() {
  console.info("Resetting database records...");

  await prisma.apiRateLimitBucket.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetCode.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.postmortem.deleteMany();
  await prisma.incidentTimelineEvent.deleteMany();
  await prisma.incidentAssignee.deleteMany();
  await prisma.alertEvent.deleteMany();
  await prisma.logEvent.deleteMany();
  await prisma.errorEvent.deleteMany();
  await prisma.deployEvent.deleteMany();
  await prisma.runbook.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.dailyServiceMetric.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.service.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  console.info("Creating baseline users and teams...");

  const demoPasswordHash = await bcrypt.hash("password", 12);

  const [adminUser, incidentCommanderUser, engineerUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@demo.dev",
        name: "Admin User",
        role: UserRole.ADMIN,
        passwordHash: demoPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "ic@demo.dev",
        name: "Incident Commander",
        role: UserRole.IC,
        passwordHash: demoPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "engineer@demo.dev",
        name: "Platform Engineer",
        role: UserRole.ENGINEER,
        passwordHash: demoPasswordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "viewer@demo.dev",
        name: "Read Only Viewer",
        role: UserRole.VIEWER,
        passwordHash: demoPasswordHash,
      },
    }),
  ]);

  const users = [adminUser, incidentCommanderUser, engineerUser, viewerUser];

  const [teamCore, teamCommerce] = await Promise.all([
    prisma.team.create({
      data: {
        name: "Core Platform",
        slug: "core-platform",
      },
    }),
    prisma.team.create({
      data: {
        name: "Commerce Systems",
        slug: "commerce-systems",
      },
    }),
  ]);

  const teams = [teamCore, teamCommerce];

  for (const user of users) {
    await prisma.teamMembership.create({
      data: {
        userId: user.id,
        teamId: teamCore.id,
        role: user.role === UserRole.ADMIN ? TeamMembershipRole.OWNER : TeamMembershipRole.MEMBER,
      },
    });

    await prisma.teamMembership.create({
      data: {
        userId: user.id,
        teamId: teamCommerce.id,
        role: user.role === UserRole.ADMIN ? TeamMembershipRole.OWNER : TeamMembershipRole.MEMBER,
      },
    });
  }

  const serviceSeeds = [
    { name: "API Gateway", slug: "api-gateway", team: teamCore.id, tier: ServiceTier.CRITICAL },
    { name: "Auth Service", slug: "auth-service", team: teamCore.id, tier: ServiceTier.CRITICAL },
    { name: "Billing Engine", slug: "billing-engine", team: teamCommerce.id, tier: ServiceTier.HIGH },
    { name: "Checkout API", slug: "checkout-api", team: teamCommerce.id, tier: ServiceTier.CRITICAL },
    { name: "Search Service", slug: "search-service", team: teamCommerce.id, tier: ServiceTier.HIGH },
    { name: "Notifications", slug: "notifications", team: teamCore.id, tier: ServiceTier.MEDIUM },
    { name: "Inventory Sync", slug: "inventory-sync", team: teamCommerce.id, tier: ServiceTier.HIGH },
    { name: "Analytics Collector", slug: "analytics-collector", team: teamCore.id, tier: ServiceTier.MEDIUM },
    { name: "Admin Console API", slug: "admin-console-api", team: teamCore.id, tier: ServiceTier.LOW },
    { name: "Worker Orchestrator", slug: "worker-orchestrator", team: teamCore.id, tier: ServiceTier.HIGH },
  ];

  const services = [] as Array<{
    id: string;
    name: string;
    slug: string;
    teamId: string;
  }>;

  for (const serviceSeed of serviceSeeds) {
    const created = await prisma.service.create({
      data: {
        teamId: serviceSeed.team,
        name: serviceSeed.name,
        slug: serviceSeed.slug,
        tier: serviceSeed.tier,
        repoUrl: `https://github.com/demo/${serviceSeed.slug}`,
        runbookUrl: `https://runbooks.demo.dev/${serviceSeed.slug}`,
        ownerUserId: pick([adminUser.id, incidentCommanderUser.id, engineerUser.id]),
      },
    });

    services.push({
      id: created.id,
      name: created.name,
      slug: created.slug,
      teamId: created.teamId,
    });
  }

  const environments = [] as Array<{ id: string; serviceId: string; name: string }>;

  for (const service of services) {
    for (const environmentName of ["prod", "staging", "dev"]) {
      const environment = await prisma.environment.create({
        data: {
          serviceId: service.id,
          name: environmentName,
        },
      });

      environments.push({
        id: environment.id,
        serviceId: service.id,
        name: environment.name,
      });
    }
  }

  console.info("Creating incidents, timelines, and assignees...");

  const incidents = [] as Array<{ id: string; serviceId: string | null; teamId: string; status: IncidentStatus }>;
  const resolvedIncidentIds: string[] = [];

  for (let index = 1; index <= 180; index += 1) {
    const service = pick(services);
    const startedAt = randomDateWithinDays(90);
    const detectedAt = new Date(startedAt.getTime() + Math.floor(Math.random() * 10 * 60_000));
    const status = pickWeighted<IncidentStatus>([
      { value: IncidentStatus.OPEN, weight: 20 },
      { value: IncidentStatus.INVESTIGATING, weight: 25 },
      { value: IncidentStatus.MITIGATED, weight: 15 },
      { value: IncidentStatus.RESOLVED, weight: 40 },
    ]);

    const severity = pickWeighted<IncidentSeverity>([
      { value: IncidentSeverity.SEV1, weight: 15 },
      { value: IncidentSeverity.SEV2, weight: 30 },
      { value: IncidentSeverity.SEV3, weight: 35 },
      { value: IncidentSeverity.SEV4, weight: 20 },
    ]);

    const acknowledgedAt =
      status === IncidentStatus.OPEN
        ? null
        : new Date(detectedAt.getTime() + Math.floor(Math.random() * 40 * 60_000));

    const resolvedAt =
      status === IncidentStatus.RESOLVED
        ? new Date(startedAt.getTime() + (30 + Math.floor(Math.random() * 2400)) * 60_000)
        : null;

    const commander = pick([adminUser, incidentCommanderUser, engineerUser]);

    const incident = await prisma.incident.create({
      data: {
        teamId: service.teamId,
        serviceId: service.id,
        incidentKey: `INC-${String(index).padStart(6, "0")}`,
        title: `${pick(["Latency spike", "Database contention", "Error surge", "Queue backlog", "Deployment regression"])} in ${service.name}`,
        severity,
        status,
        startedAt,
        detectedAt,
        acknowledgedAt,
        resolvedAt,
        summary: `${service.name} experienced ${randomWords(10)} requiring incident command intervention.`,
        rootCause:
          status === IncidentStatus.RESOLVED
            ? `Root cause analysis identified ${randomWords(12)}.`
            : null,
        impact: `Customer impact included ${pick(["checkout failures", "elevated latency", "dropped requests", "delayed notifications"])}.`,
        createdByUserId: pick(users).id,
        commanderUserId: commander.id,
      },
    });

    incidents.push({
      id: incident.id,
      serviceId: incident.serviceId,
      teamId: incident.teamId,
      status: incident.status,
    });

    if (status === IncidentStatus.RESOLVED) {
      resolvedIncidentIds.push(incident.id);
    }

    const assigneeUserIds = Array.from(new Set([commander.id, engineerUser.id]));
    await prisma.incidentAssignee.createMany({
      data: assigneeUserIds.map((userId) => ({
        incidentId: incident.id,
        userId,
        role: userId === commander.id ? "COMMANDER" : "INVESTIGATOR",
      })),
    });

    const timelineEvents: Array<{
      incidentId: string;
      type: TimelineEventType;
      message: string;
      createdByUserId: string;
    }> = [
      {
        incidentId: incident.id,
        type: TimelineEventType.CREATED,
        message: `${incident.incidentKey} opened and escalated to incident command`,
        createdByUserId: incident.createdByUserId,
      },
      {
        incidentId: incident.id,
        type: TimelineEventType.NOTE,
        message: `Initial assessment: ${randomWords(12)}.`,
        createdByUserId: engineerUser.id,
      },
      {
        incidentId: incident.id,
        type: TimelineEventType.ERROR_SPIKE,
        message: `Observed elevated errors for ${service.name}.`,
        createdByUserId: incidentCommanderUser.id,
      },
    ];

    if (status === IncidentStatus.MITIGATED || status === IncidentStatus.RESOLVED) {
      timelineEvents.push({
        incidentId: incident.id,
        type: TimelineEventType.MITIGATED,
        message: `Mitigation applied through traffic shaping and feature flag controls.`,
        createdByUserId: commander.id,
      });
    }

    if (status === IncidentStatus.RESOLVED) {
      timelineEvents.push({
        incidentId: incident.id,
        type: TimelineEventType.RESOLVED,
        message: `Incident resolved with validated rollback and recovery checks.`,
        createdByUserId: commander.id,
      });
    }

    await prisma.incidentTimelineEvent.createMany({
      data: timelineEvents,
    });
  }

  console.info("Creating deploy, error, log, and alert events...");

  const deployEvents = Array.from({ length: 220 }).map((_, index) => {
    const service = pick(services);
    const serviceEnvironments = environments.filter((env) => env.serviceId === service.id);
    const environment = pick(serviceEnvironments);
    const status = pickWeighted<DeployStatus>([
      { value: DeployStatus.SUCCEEDED, weight: 70 },
      { value: DeployStatus.FAILED, weight: 15 },
      { value: DeployStatus.ROLLED_BACK, weight: 10 },
      { value: DeployStatus.STARTED, weight: 5 },
    ]);
    const startedAt = randomDateWithinDays(60);

    return {
      serviceId: service.id,
      environmentId: environment.id,
      provider: pick([DeployProvider.GITHUB, DeployProvider.GITLAB, DeployProvider.CIRCLECI, DeployProvider.MANUAL]),
      externalId: `deploy-${index + 1}`,
      commitSha: randomSha(),
      commitMessage: `Deploy ${randomWords(6)}`,
      branch: pick(["main", "release", "hotfix", "canary"]),
      author: pick(["alex", "sam", "morgan", "jordan", "taylor"]),
      startedAt,
      finishedAt: new Date(startedAt.getTime() + (5 + Math.floor(Math.random() * 60)) * 60_000),
      status,
      url: `https://ci.example.dev/deploy/${index + 1}`,
    };
  });

  await prisma.deployEvent.createMany({ data: deployEvents });

  const errorEvents = Array.from({ length: 340 }).map((_, index) => {
    const service = pick(services);
    const serviceEnvironments = environments.filter((env) => env.serviceId === service.id);
    const environment = pick(serviceEnvironments);
    const firstSeenAt = randomDateWithinDays(45);
    const lastSeenAt = new Date(firstSeenAt.getTime() + (5 + Math.floor(Math.random() * 2000)) * 60_000);

    return {
      serviceId: service.id,
      environmentId: environment.id,
      provider: pick([ErrorProvider.SENTRY, ErrorProvider.DATADOG, ErrorProvider.ROLLBAR, ErrorProvider.MANUAL]),
      fingerprint: `fp-${index + 1}`,
      title: `${pick(["Unhandled exception", "Timeout", "Database deadlock", "Resource exhaustion"])} in ${service.name}`,
      level: pick([ErrorLevel.ERROR, ErrorLevel.WARNING, ErrorLevel.FATAL]),
      firstSeenAt,
      lastSeenAt,
      occurrences: 1 + Math.floor(Math.random() * 450),
      url: `https://errors.example.dev/issues/${index + 1}`,
      rawJson: { sample: randomWords(8), code: index + 1 },
    };
  });

  await prisma.errorEvent.createMany({ data: errorEvents });

  const logEvents = Array.from({ length: 1400 }).map((_, index) => {
    const service = pick(services);
    const serviceEnvironments = environments.filter((env) => env.serviceId === service.id);
    const environment = pick(serviceEnvironments);
    const timestamp = randomDateWithinDays(30);

    return {
      serviceId: service.id,
      environmentId: environment.id,
      level: pick([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]),
      message: `${pick(["Request processed", "Queue drained", "Retrying call", "Circuit open", "Dependency degraded"])} · ${randomWords(6)}`,
      timestamp,
      traceId: crypto.randomBytes(8).toString("hex"),
      spanId: crypto.randomBytes(6).toString("hex"),
      source: pick(["api", "worker", "ingest", "scheduler", "cron"]),
      rawJson: { line: index + 1, hint: randomWords(5) },
    };
  });

  await prisma.logEvent.createMany({ data: logEvents });

  const alertEvents = Array.from({ length: 240 }).map((_, index) => {
    const service = pick(services);
    const incident = Math.random() > 0.45 ? pick(incidents) : null;
    const triggeredAt = randomDateWithinDays(30);
    const status = pickWeighted<AlertStatus>([
      { value: AlertStatus.TRIGGERED, weight: 45 },
      { value: AlertStatus.ACKED, weight: 25 },
      { value: AlertStatus.RESOLVED, weight: 30 },
    ]);

    return {
      incidentId: incident?.id ?? null,
      serviceId: incident?.serviceId ?? service.id,
      source: pick([AlertSource.DATADOG, AlertSource.CLOUDWATCH, AlertSource.PROMETHEUS, AlertSource.MANUAL]),
      alertKey: `ALERT-${String(index + 1).padStart(6, "0")}`,
      title: `${pick(["High error rate", "Latency threshold breached", "CPU saturation", "Queue depth exceeded"])} on ${service.name}`,
      severity: pick([AlertSeverity.CRITICAL, AlertSeverity.HIGH, AlertSeverity.MEDIUM, AlertSeverity.LOW]),
      triggeredAt,
      resolvedAt: status === AlertStatus.RESOLVED ? new Date(triggeredAt.getTime() + 45 * 60_000) : null,
      status,
      payloadJson: { source: "seed", index, detail: randomWords(4) },
    };
  });

  await prisma.alertEvent.createMany({ data: alertEvents });

  console.info("Creating runbooks and postmortems...");

  const runbooksData = [] as Array<{
    teamId: string;
    serviceId: string | null;
    title: string;
    slug: string;
    markdown: string;
    tagsJson: string[];
    version: number;
    isActive: boolean;
  }>;

  for (const service of services) {
    runbooksData.push({
      teamId: service.teamId,
      serviceId: service.id,
      title: `${service.name} Incident Response`,
      slug: `${service.slug}-incident-response`,
      markdown: `# ${service.name} Incident Response\n\n## Triage\n- Validate active alerts\n- Confirm blast radius\n\n## Mitigation\n- Roll back recent deploy\n- Scale dependent services\n\n## Recovery\n- Monitor SLO burn for 30m`,
      tagsJson: ["incident", "response", service.slug],
      version: 1,
      isActive: true,
    });

    runbooksData.push({
      teamId: service.teamId,
      serviceId: service.id,
      title: `${service.name} Deployment Rollback`,
      slug: `${service.slug}-deploy-rollback`,
      markdown: `# ${service.name} Deployment Rollback\n\n1. Pause traffic\n2. Promote last-known-good release\n3. Verify health checks\n4. Communicate status`,
      tagsJson: ["deploy", "rollback", service.slug],
      version: 1,
      isActive: true,
    });
  }

  // Add version history for selected runbooks
  for (const service of services.slice(0, 5)) {
    runbooksData.push({
      teamId: service.teamId,
      serviceId: service.id,
      title: `${service.name} Incident Response`,
      slug: `${service.slug}-incident-response`,
      markdown: `# ${service.name} Incident Response v2\n\nUpdated escalation tree and metric checks for improved MTTR.`,
      tagsJson: ["incident", "response", "v2", service.slug],
      version: 2,
      isActive: true,
    });
  }

  for (const runbook of runbooksData) {
    await prisma.runbook.create({
      data: {
        ...runbook,
        createdByUserId: adminUser.id,
      },
    });
  }

  const postmortemIncidents = resolvedIncidentIds.slice(0, 40);

  for (const [index, incidentId] of postmortemIncidents.entries()) {
    const postmortem = await prisma.postmortem.create({
      data: {
        incidentId,
        authorUserId: pick([adminUser.id, incidentCommanderUser.id, engineerUser.id]),
        whatHappened: `At ${index + 1} we observed ${randomWords(14)} and escalated incident command.`,
        impact: `Impact included ${randomWords(10)} affecting user-facing transactions and internal workflows.`,
        rootCause: `Root cause analysis isolated ${randomWords(12)} as the primary trigger.`,
        detectionGaps: `Detection gaps included ${randomWords(10)} with delayed alert routing.`,
        actionItemsSummary: `Action plan focuses on ${randomWords(10)} across platform and service teams.`,
        followUpBy: new Date(Date.now() + (7 + Math.floor(Math.random() * 35)) * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.actionItem.createMany({
      data: [
        {
          postmortemId: postmortem.id,
          title: `Ship alert tuning package #${index + 1}`,
          description: `Improve precision for noisy monitors: ${randomWords(8)}.`,
          ownerUserId: engineerUser.id,
          dueDate: new Date(Date.now() + (5 + index) * 24 * 60 * 60 * 1000),
          status: pick([ActionItemStatus.OPEN, ActionItemStatus.IN_PROGRESS]),
          priority: pick([ActionItemPriority.P1, ActionItemPriority.P2]),
        },
        {
          postmortemId: postmortem.id,
          title: `Run failover drill #${index + 1}`,
          description: `Validate runbook against fresh scenario data and reporting.`,
          ownerUserId: incidentCommanderUser.id,
          dueDate: new Date(Date.now() + (12 + index) * 24 * 60 * 60 * 1000),
          status: pick([ActionItemStatus.OPEN, ActionItemStatus.DONE]),
          priority: pick([ActionItemPriority.P2, ActionItemPriority.P3]),
        },
      ],
    });
  }

  for (const team of teams) {
    await prisma.integrationCredential.createMany({
      data: [
        {
          teamId: team.id,
          provider: "SENTRY",
          encryptedToken: `enc_sentry_${team.slug}`,
        },
        {
          teamId: team.id,
          provider: "DATADOG",
          encryptedToken: `enc_datadog_${team.slug}`,
        },
        {
          teamId: team.id,
          provider: "GITHUB",
          encryptedToken: `enc_github_${team.slug}`,
        },
      ],
    });
  }

  await prisma.savedView.createMany({
    data: [
      {
        userId: adminUser.id,
        name: "Critical Open Incidents",
        scope: "incidents",
        filtersJson: { status: "OPEN", severity: "SEV1" },
      },
      {
        userId: adminUser.id,
        name: "Core Platform 7d",
        scope: "dashboard",
        filtersJson: { window: "7", teamId: teamCore.id },
      },
    ],
  });

  console.info("Seed complete.");

  const [teamCount, serviceCount, incidentCount, logCount, errorCount, deployCount, runbookCount, postmortemCount] =
    await Promise.all([
      prisma.team.count(),
      prisma.service.count(),
      prisma.incident.count(),
      prisma.logEvent.count(),
      prisma.errorEvent.count(),
      prisma.deployEvent.count(),
      prisma.runbook.count(),
      prisma.postmortem.count(),
    ]);

  console.info(
    JSON.stringify(
      {
        teamCount,
        serviceCount,
        incidentCount,
        logCount,
        errorCount,
        deployCount,
        runbookCount,
        postmortemCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
