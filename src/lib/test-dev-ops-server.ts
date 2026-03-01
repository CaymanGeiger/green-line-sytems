import crypto from "node:crypto";

import {
  AlertSeverity,
  AlertStatus,
  DeployStatus,
  ErrorLevel,
  IncidentSeverity,
  IncidentStatus,
  LogLevel,
  Prisma,
  ServiceTier,
  TimelineEventType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SIMULATION_FAULT_STATE,
  PRESET_VALUES,
  type SimulationFaultState,
  type SimulationOutcome,
  type SimulationPreset,
  type SimulationProfile,
  type SimulationSeverityOverride,
  toSimulatorKind,
} from "@/lib/test-dev-ops";

type ServiceRecord = {
  id: string;
  name: string;
  slug: string;
  teamId: string;
  tier: ServiceTier;
};

type SimulateActionInput = {
  userId: string;
  serviceId: string;
  action: string;
  expectedOutcome: SimulationOutcome;
  severityOverride: SimulationSeverityOverride;
  intensity: number;
  profile: SimulationProfile;
  payload: Record<string, unknown>;
  faults: SimulationFaultState;
  presetLabel?: string;
};

export type SimulateActionResult = {
  serviceId: string;
  serviceName: string;
  kind: string;
  outcome: SimulationOutcome;
  logsWritten: number;
  errorWritten: boolean;
  alertWritten: boolean;
  deployWritten: boolean;
  incidentId?: string;
  incidentKey?: string;
  simulatedResponse: {
    statusCode: number;
    summary: string;
  };
};

type PresetStep = {
  serviceId: string;
  action: string;
  expectedOutcome: SimulationOutcome;
  intensity: number;
  payload?: Record<string, unknown>;
};

const REQUIRED_SIMULATION_SERVICES: Array<{
  kind: string;
  slug: string;
  name: string;
  tier: ServiceTier;
}> = [
  { kind: "API_GATEWAY", slug: "sim-api-gateway", name: "API Gateway", tier: "CRITICAL" },
  { kind: "AUTH", slug: "sim-auth-service", name: "Auth Service", tier: "CRITICAL" },
  { kind: "CHECKOUT", slug: "sim-checkout-billing", name: "Checkout Billing", tier: "CRITICAL" },
  { kind: "SEARCH", slug: "sim-search-service", name: "Search Service", tier: "HIGH" },
  { kind: "WORKER", slug: "sim-worker-queue", name: "Worker Queue", tier: "HIGH" },
];

export async function ensureTeamSimulationServices(teamId: string): Promise<void> {
  const existing = await prisma.service.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      teamId: true,
      tier: true,
    },
  });

  for (const requiredService of REQUIRED_SIMULATION_SERVICES) {
    const matched = existing.find(
      (service) =>
        toSimulatorKind(service.name, service.slug) === requiredService.kind || service.slug === requiredService.slug,
    );

    if (matched) {
      continue;
    }

    const service = await prisma.service.create({
      data: {
        teamId,
        name: requiredService.name,
        slug: requiredService.slug,
        tier: requiredService.tier,
        repoUrl: `https://github.com/demo/${requiredService.slug}`,
        runbookUrl: `https://runbooks.demo.dev/${requiredService.slug}`,
      },
      select: {
        id: true,
      },
    });

    await prisma.environment.createMany({
      data: [
        { serviceId: service.id, name: "prod" },
        { serviceId: service.id, name: "staging" },
        { serviceId: service.id, name: "dev" },
      ],
    });
  }
}

function mergedFaults(faults?: Partial<SimulationFaultState>): SimulationFaultState {
  return {
    ...DEFAULT_SIMULATION_FAULT_STATE,
    ...(faults ?? {}),
  };
}

function randomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

const INCIDENT_SEVERITY_RANK: Record<IncidentSeverity, number> = {
  SEV1: 4,
  SEV2: 3,
  SEV3: 2,
  SEV4: 1,
};

function mapOverrideToAlertSeverity(severityOverride: SimulationSeverityOverride): AlertSeverity | null {
  if (severityOverride === "SEV1") {
    return "CRITICAL";
  }
  if (severityOverride === "SEV2") {
    return "HIGH";
  }
  if (severityOverride === "SEV3") {
    return "MEDIUM";
  }
  if (severityOverride === "SEV4") {
    return "LOW";
  }
  return null;
}

function createAlertSeverity(
  kind: string,
  outcome: SimulationOutcome,
  severityOverride: SimulationSeverityOverride,
): AlertSeverity {
  const mapped = mapOverrideToAlertSeverity(severityOverride);
  if (mapped) {
    return mapped;
  }

  if (outcome === "FAILURE") {
    return kind === "CHECKOUT" ? "CRITICAL" : "HIGH";
  }

  if (outcome === "WARNING") {
    return kind === "AUTH" ? "HIGH" : "MEDIUM";
  }

  return "LOW";
}

function createIncidentSeverity(
  kind: string,
  outcome: SimulationOutcome,
  severityOverride: SimulationSeverityOverride,
): IncidentSeverity {
  if (severityOverride !== "AUTO") {
    return severityOverride;
  }

  if (outcome === "FAILURE" && kind === "CHECKOUT") {
    return "SEV1";
  }

  if (outcome === "FAILURE") {
    return "SEV2";
  }

  return "SEV3";
}

function determineErrorFingerprint(kind: string, action: string, outcome: SimulationOutcome): string {
  const actionKey = action.toLowerCase();

  if (kind === "API_GATEWAY") {
    return outcome === "FAILURE" ? "api-gateway-timeout" : "api-gateway-throttle";
  }

  if (kind === "AUTH") {
    return actionKey.includes("login") ? "auth-login-failure" : "auth-store-unavailable";
  }

  if (kind === "CHECKOUT") {
    return actionKey.includes("idempotency") ? "checkout-timeout" : "payment-provider-failure";
  }

  if (kind === "SEARCH") {
    return actionKey.includes("index") ? "search-index-lag" : "search-backend-unavailable";
  }

  return actionKey.includes("poison") ? "poison-message-loop" : "job-timeout";
}

function incidentRequired(outcome: SimulationOutcome, intensity: number, faults: SimulationFaultState): boolean {
  if (outcome === "FAILURE" && intensity >= 3) {
    return true;
  }

  if (
    outcome === "WARNING" &&
    intensity >= 5 &&
    (faults.externalApiFailureRate >= 60 || faults.packetLossEnabled || faults.cpuSaturationEnabled)
  ) {
    return true;
  }

  return false;
}

async function generateIncidentKey(transaction: Prisma.TransactionClient): Promise<string> {
  const latest = await transaction.incident.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      incidentKey: true,
    },
  });

  const currentNumber = latest?.incidentKey
    ? Number.parseInt(latest.incidentKey.split("-")[1] ?? "0", 10)
    : 0;

  const nextNumber = Number.isFinite(currentNumber) ? currentNumber + 1 : 1;
  return `INC-${String(nextNumber).padStart(6, "0")}`;
}

function responseForOutcome(kind: string, outcome: SimulationOutcome, action: string): {
  statusCode: number;
  summary: string;
} {
  if (outcome === "HEALTHY") {
    return {
      statusCode: 200,
      summary: `${kind} action '${action}' completed with nominal telemetry`,
    };
  }

  if (outcome === "WARNING") {
    return {
      statusCode: 429,
      summary: `${kind} action '${action}' degraded and triggered warning telemetry`,
    };
  }

  return {
    statusCode: 503,
    summary: `${kind} action '${action}' failed and generated incident-level telemetry`,
  };
}

function profileMultiplier(profile: SimulationProfile): number {
  if (profile === "HIGH_TRAFFIC") {
    return 1.4;
  }

  if (profile === "RELEASE_DAY") {
    return 1.7;
  }

  return 1;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export async function simulateServiceAction(input: SimulateActionInput): Promise<SimulateActionResult> {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    include: {
      environments: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const kind = toSimulatorKind(service.name, service.slug);
  const faults = mergedFaults(input.faults);
  const appliedProfileMultiplier = profileMultiplier(input.profile);
  const now = new Date();
  const baseLogCount =
    input.expectedOutcome === "HEALTHY"
      ? 2 + input.intensity
      : input.expectedOutcome === "WARNING"
        ? 3 + input.intensity * 2
        : 5 + input.intensity * 2;
  const logCount = Math.max(1, Math.min(15, Math.round(baseLogCount * appliedProfileMultiplier)));

  const environment =
    service.environments.find((entry) => entry.name.toLowerCase() === "prod") ?? service.environments[0] ?? null;

  const levelByOutcome: Record<SimulationOutcome, LogLevel> = {
    HEALTHY: "INFO",
    WARNING: "WARN",
    FAILURE: "ERROR",
  };

  const response = responseForOutcome(kind, input.expectedOutcome, input.action);

  const logRows = Array.from({ length: logCount }).map((_, index) => {
    const latencyMs = Math.round(
      (80 + input.intensity * 20 + faults.dbLatencyMultiplier * 25 + (faults.cpuSaturationEnabled ? 160 : 0)) *
        appliedProfileMultiplier,
    );

    return {
      serviceId: service.id,
      environmentId: environment?.id,
      level: levelByOutcome[input.expectedOutcome],
      message: `[SIM] ${kind} ${input.action} ${input.expectedOutcome.toLowerCase()} run ${index + 1}/${logCount} · latency=${latencyMs}ms · extFail=${faults.externalApiFailureRate}%`,
      timestamp: new Date(now.getTime() - (logCount - index) * 900),
      traceId: randomHex(16),
      spanId: randomHex(12),
      source: "test-dev-ops",
      simulated: true,
      rawJson: toJson({
        simulator: true,
        action: input.action,
        outcome: input.expectedOutcome,
        severityOverride: input.severityOverride,
        profile: input.profile,
        faults,
        payload: input.payload,
        preset: input.presetLabel ?? null,
      }),
    };
  });

  let incidentId: string | undefined;
  let incidentKey: string | undefined;

  await prisma.$transaction(async (transaction) => {
    await transaction.logEvent.createMany({ data: logRows });

    const shouldWriteError = input.expectedOutcome !== "HEALTHY";
    if (shouldWriteError) {
      const fingerprint = determineErrorFingerprint(kind, input.action, input.expectedOutcome);
      const errorLevel: ErrorLevel =
        input.expectedOutcome === "FAILURE" && input.intensity >= 4 ? "FATAL" : "ERROR";

      await transaction.errorEvent.create({
        data: {
          serviceId: service.id,
          environmentId: environment?.id,
          provider: "MANUAL",
          fingerprint: `sim-${fingerprint}`,
          title: `[SIM] ${kind} ${input.action} ${input.expectedOutcome.toLowerCase()} error burst`,
          level: errorLevel,
          firstSeenAt: new Date(now.getTime() - 2 * 60_000),
          lastSeenAt: now,
          occurrences: Math.max(
            1,
            Math.round((input.intensity * 18 + faults.externalApiFailureRate * 0.9) * appliedProfileMultiplier),
          ),
          simulated: true,
          url: null,
          rawJson: toJson({
            simulator: true,
            action: input.action,
            faults,
            payload: input.payload,
          }),
        },
      });

      const alertSeverity = createAlertSeverity(kind, input.expectedOutcome, input.severityOverride);
      await transaction.alertEvent.create({
        data: {
          serviceId: service.id,
          source: "MANUAL",
          alertKey: `SIM-${kind}-${Date.now()}-${randomHex(6)}`,
          title: `[SIM] ${kind} ${input.action} threshold breached`,
          severity: alertSeverity,
          triggeredAt: now,
          status: "TRIGGERED",
          simulated: true,
          payloadJson: toJson({
            simulator: true,
            action: input.action,
            outcome: input.expectedOutcome,
            severityOverride: input.severityOverride,
            profile: input.profile,
            faults,
          }),
        },
      });
    }

    const lowerAction = input.action.toLowerCase();
    const shouldWriteDeploy = lowerAction.includes("deploy") || lowerAction.includes("rollback");

    if (shouldWriteDeploy) {
      const deployStatus: DeployStatus =
        lowerAction.includes("rollback") && input.expectedOutcome === "HEALTHY"
          ? "ROLLED_BACK"
          : input.expectedOutcome === "FAILURE"
            ? "FAILED"
            : input.expectedOutcome === "WARNING"
              ? "STARTED"
              : "SUCCEEDED";

      await transaction.deployEvent.create({
        data: {
          serviceId: service.id,
          environmentId: environment?.id,
          provider: "MANUAL",
          externalId: `sim-deploy-${Date.now()}-${randomHex(8)}`,
          commitSha: randomHex(12),
          commitMessage: `[SIM] ${kind} ${input.action}`,
          branch: input.profile === "RELEASE_DAY" ? "release" : "main",
          author: "simulator",
          startedAt: new Date(now.getTime() - 60_000),
          finishedAt: now,
          status: deployStatus,
          simulated: true,
          url: null,
        },
      });
    }

    const needsIncident = incidentRequired(input.expectedOutcome, input.intensity, faults);

    if (needsIncident) {
      const existingIncident = await transaction.incident.findFirst({
        where: {
          teamId: service.teamId,
          serviceId: service.id,
          simulated: true,
          status: {
            not: "RESOLVED",
          },
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      if (existingIncident) {
        const targetSeverity = createIncidentSeverity(kind, input.expectedOutcome, input.severityOverride);
        const escalate =
          INCIDENT_SEVERITY_RANK[targetSeverity] > INCIDENT_SEVERITY_RANK[existingIncident.severity];

        const updatedIncident = await transaction.incident.update({
          where: {
            id: existingIncident.id,
          },
          data: {
            severity: escalate ? targetSeverity : existingIncident.severity,
            status: existingIncident.status === "OPEN" ? IncidentStatus.INVESTIGATING : existingIncident.status,
            summary: `[SIM] ${kind} ${input.action} continued impact under ${input.profile}`,
            acknowledgedAt: existingIncident.acknowledgedAt ?? now,
            simulated: true,
          },
        });

        incidentId = updatedIncident.id;
        incidentKey = updatedIncident.incidentKey;

        await transaction.incidentTimelineEvent.create({
          data: {
            incidentId: updatedIncident.id,
            type: TimelineEventType.ERROR_SPIKE,
            message: `[SIM] ${kind} ${input.action} produced ${input.expectedOutcome.toLowerCase()} telemetry at intensity ${input.intensity}`,
            simulated: true,
            createdByUserId: input.userId,
          },
        });
      } else {
        const key = await generateIncidentKey(transaction);
        const severity = createIncidentSeverity(kind, input.expectedOutcome, input.severityOverride);

        const createdIncident = await transaction.incident.create({
          data: {
            teamId: service.teamId,
            serviceId: service.id,
            incidentKey: key,
            title: `[SIM] ${service.name} ${input.action} outage`,
            severity,
            status: IncidentStatus.OPEN,
            startedAt: now,
            detectedAt: now,
            simulated: true,
            summary: `[SIM] Generated by Test DevOps simulator (${input.profile})`,
            impact: `[SIM] Simulated customer impact and reliability degradation.`,
            createdByUserId: input.userId,
            commanderUserId: input.userId,
          },
        });

        incidentId = createdIncident.id;
        incidentKey = createdIncident.incidentKey;

        await transaction.incidentTimelineEvent.createMany({
          data: [
            {
              incidentId: createdIncident.id,
              type: TimelineEventType.CREATED,
              message: `[SIM] Incident auto-created for ${kind} failure sequence`,
              simulated: true,
              createdByUserId: input.userId,
            },
            {
              incidentId: createdIncident.id,
              type: TimelineEventType.ERROR_SPIKE,
              message: `[SIM] ${kind} ${input.action} triggered incident threshold`,
              simulated: true,
              createdByUserId: input.userId,
            },
          ],
        });
      }
    }
  });

  return {
    serviceId: service.id,
    serviceName: service.name,
    kind,
    outcome: input.expectedOutcome,
    logsWritten: logRows.length,
    errorWritten: input.expectedOutcome !== "HEALTHY",
    alertWritten: input.expectedOutcome !== "HEALTHY",
    deployWritten: input.action.toLowerCase().includes("deploy") || input.action.toLowerCase().includes("rollback"),
    incidentId,
    incidentKey,
    simulatedResponse: response,
  };
}

function firstServiceByKind(services: ServiceRecord[], kind: string): ServiceRecord | undefined {
  return services.find((service) => toSimulatorKind(service.name, service.slug) === kind);
}

function presetSteps(
  preset: SimulationPreset,
  services: ServiceRecord[],
  preferredServiceId?: string | null,
): PresetStep[] {
  const preferredService = preferredServiceId
    ? services.find((service) => service.id === preferredServiceId)
    : undefined;

  const checkoutService =
    preferredService && toSimulatorKind(preferredService.name, preferredService.slug) === "CHECKOUT"
      ? preferredService
      : firstServiceByKind(services, "CHECKOUT") ?? services[0];

  const apiService = firstServiceByKind(services, "API_GATEWAY") ?? services[0];
  const authService = firstServiceByKind(services, "AUTH") ?? services[0];
  const searchService = firstServiceByKind(services, "SEARCH") ?? services[0];
  const workerService = firstServiceByKind(services, "WORKER") ?? services[0];

  if (preset === "SEV1_CHECKOUT_OUTAGE") {
    return [
      {
        serviceId: checkoutService!.id,
        action: "submit-checkout",
        expectedOutcome: "FAILURE",
        intensity: 5,
        payload: { paymentMethod: "card", amountUsd: 248.51, stage: "failed deploy" },
      },
      {
        serviceId: checkoutService!.id,
        action: "processor-latency",
        expectedOutcome: "FAILURE",
        intensity: 5,
        payload: { provider: "primary", timeoutMs: 9000 },
      },
      {
        serviceId: apiService!.id,
        action: "rate-burst",
        expectedOutcome: "WARNING",
        intensity: 4,
        payload: { burst: "extreme" },
      },
    ];
  }

  if (preset === "LATENCY_DEGRADATION") {
    return [
      {
        serviceId: apiService!.id,
        action: "dependency-latency",
        expectedOutcome: "WARNING",
        intensity: 3,
        payload: { dependencyMs: 1200 },
      },
      {
        serviceId: searchService!.id,
        action: "run-query",
        expectedOutcome: "WARNING",
        intensity: 3,
        payload: { queryClass: "complex" },
      },
      {
        serviceId: authService!.id,
        action: "token-validation",
        expectedOutcome: "WARNING",
        intensity: 2,
        payload: { reqPerSecond: 150 },
      },
    ];
  }

  if (preset === "NOISY_ALERT_FALSE_POSITIVE") {
    return [
      {
        serviceId: workerService!.id,
        action: "enqueue-jobs",
        expectedOutcome: "WARNING",
        intensity: 2,
        payload: { queueDepth: 1200 },
      },
      {
        serviceId: workerService!.id,
        action: "dead-letter-toggle",
        expectedOutcome: "HEALTHY",
        intensity: 1,
        payload: { recovered: true },
      },
    ];
  }

  return [
    {
      serviceId: checkoutService!.id,
      action: "deploy-failure",
      expectedOutcome: "FAILURE",
      intensity: 4,
      payload: { release: "2026.03.01" },
    },
    {
      serviceId: checkoutService!.id,
      action: "deploy-rollback",
      expectedOutcome: "HEALTHY",
      intensity: 2,
      payload: { release: "rollback-to-2026.02.27" },
    },
    {
      serviceId: apiService!.id,
      action: "dependency-latency",
      expectedOutcome: "HEALTHY",
      intensity: 1,
      payload: { recovered: true },
    },
  ];
}

export async function runSimulationPreset(input: {
  userId: string;
  teamId: string;
  preset: SimulationPreset;
  profile: SimulationProfile;
  severityOverride: SimulationSeverityOverride;
  faults: SimulationFaultState;
  serviceId?: string | null;
}): Promise<{ preset: SimulationPreset; stepsRun: number; incidentsTouched: number }> {
  if (!PRESET_VALUES.includes(input.preset)) {
    throw new Error("Unknown preset");
  }

  const services = await prisma.service.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      teamId: true,
      tier: true,
    },
  });

  if (services.length === 0) {
    throw new Error("No services available for team");
  }

  const steps = presetSteps(input.preset, services, input.serviceId);
  let incidentsTouched = 0;

  for (const [index, step] of steps.entries()) {
    const result = await simulateServiceAction({
      userId: input.userId,
      serviceId: step.serviceId,
      action: step.action,
      expectedOutcome: step.expectedOutcome,
      severityOverride: input.severityOverride,
      intensity: step.intensity,
      profile: input.profile,
      payload: {
        ...(step.payload ?? {}),
        presetStep: index + 1,
      },
      faults: input.faults,
      presetLabel: input.preset,
    });

    if (result.incidentId) {
      incidentsTouched += 1;
    }
  }

  if (input.preset === "ROLLBACK_RECOVERY") {
    const unresolvedIncidents = await prisma.incident.findMany({
      where: {
        teamId: input.teamId,
        simulated: true,
        status: {
          not: IncidentStatus.RESOLVED,
        },
      },
      take: 5,
      select: {
        id: true,
      },
    });

    if (unresolvedIncidents.length > 0) {
      await prisma.$transaction(async (transaction) => {
        for (const incident of unresolvedIncidents) {
          await transaction.incident.update({
            where: { id: incident.id },
            data: {
              status: IncidentStatus.RESOLVED,
              resolvedAt: new Date(),
              summary: "[SIM] Resolved via rollback recovery preset.",
            },
          });

          await transaction.incidentTimelineEvent.create({
            data: {
              incidentId: incident.id,
              type: TimelineEventType.RESOLVED,
              message: "[SIM] Rollback validated, incident resolved.",
              simulated: true,
              createdByUserId: input.userId,
            },
          });
        }
      });
    }
  }

  return {
    preset: input.preset,
    stepsRun: steps.length,
    incidentsTouched,
  };
}

export async function resolveSimulationEvents(input: {
  userId: string;
  teamId: string;
}): Promise<{ incidentsResolved: number; alertsResolved: number; timelineEventsWritten: number }> {
  const services = await prisma.service.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
    },
  });
  const serviceIds = services.map((service) => service.id);

  const now = new Date();

  const openIncidents = await prisma.incident.findMany({
    where: {
      teamId: input.teamId,
      simulated: true,
      status: {
        not: IncidentStatus.RESOLVED,
      },
    },
    take: 20,
    select: {
      id: true,
    },
  });

  let alertsResolved = 0;

  await prisma.$transaction(async (transaction) => {
    if (serviceIds.length > 0) {
      const alertsResult = await transaction.alertEvent.updateMany({
        where: {
          simulated: true,
          serviceId: {
            in: serviceIds,
          },
          status: {
            not: AlertStatus.RESOLVED,
          },
        },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: now,
        },
      });
      alertsResolved = alertsResult.count;
    }

    for (const incident of openIncidents) {
      await transaction.incident.update({
        where: {
          id: incident.id,
        },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: now,
          summary: "[SIM] Marked resolved by simulator control.",
        },
      });

      await transaction.incidentTimelineEvent.create({
        data: {
          incidentId: incident.id,
          type: TimelineEventType.RESOLVED,
          message: "[SIM] Marked resolved by simulation control.",
          simulated: true,
          createdByUserId: input.userId,
        },
      });
    }
  });

  return {
    incidentsResolved: openIncidents.length,
    alertsResolved,
    timelineEventsWritten: openIncidents.length,
  };
}

export async function purgeSimulationData(input: {
  teamId: string;
}): Promise<{
  incidentsDeleted: number;
  alertsDeleted: number;
  logsDeleted: number;
  errorsDeleted: number;
  deploysDeleted: number;
  timelineDeleted: number;
}> {
  const services = await prisma.service.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
    },
  });
  const serviceIds = services.map((service) => service.id);

  const [timelineDeleted, alertsDeleted, logsDeleted, errorsDeleted, deploysDeleted, incidentsDeleted] =
    await prisma.$transaction([
      prisma.incidentTimelineEvent.deleteMany({
        where: {
          simulated: true,
          incident: {
            teamId: input.teamId,
          },
        },
      }),
      prisma.alertEvent.deleteMany({
        where: {
          simulated: true,
          ...(serviceIds.length > 0
            ? {
                serviceId: {
                  in: serviceIds,
                },
              }
            : {
                serviceId: {
                  in: [],
                },
              }),
        },
      }),
      prisma.logEvent.deleteMany({
        where: {
          simulated: true,
          ...(serviceIds.length > 0
            ? {
                serviceId: {
                  in: serviceIds,
                },
              }
            : {
                serviceId: {
                  in: [],
                },
              }),
        },
      }),
      prisma.errorEvent.deleteMany({
        where: {
          simulated: true,
          ...(serviceIds.length > 0
            ? {
                serviceId: {
                  in: serviceIds,
                },
              }
            : {
                serviceId: {
                  in: [],
                },
              }),
        },
      }),
      prisma.deployEvent.deleteMany({
        where: {
          simulated: true,
          ...(serviceIds.length > 0
            ? {
                serviceId: {
                  in: serviceIds,
                },
              }
            : {
                serviceId: {
                  in: [],
                },
              }),
        },
      }),
      prisma.incident.deleteMany({
        where: {
          teamId: input.teamId,
          simulated: true,
        },
      }),
    ]);

  return {
    incidentsDeleted: incidentsDeleted.count,
    alertsDeleted: alertsDeleted.count,
    logsDeleted: logsDeleted.count,
    errorsDeleted: errorsDeleted.count,
    deploysDeleted: deploysDeleted.count,
    timelineDeleted: timelineDeleted.count,
  };
}
