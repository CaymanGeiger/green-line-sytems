export const SIMULATION_PROFILE_VALUES = ["SAFE_DEMO", "HIGH_TRAFFIC", "RELEASE_DAY"] as const;
export type SimulationProfile = (typeof SIMULATION_PROFILE_VALUES)[number];

export const SIMULATION_OUTCOME_VALUES = ["HEALTHY", "WARNING", "FAILURE"] as const;
export type SimulationOutcome = (typeof SIMULATION_OUTCOME_VALUES)[number];

export const SIMULATION_SEVERITY_OVERRIDE_VALUES = ["AUTO", "SEV1", "SEV2", "SEV3", "SEV4"] as const;
export type SimulationSeverityOverride = (typeof SIMULATION_SEVERITY_OVERRIDE_VALUES)[number];

export const PRESET_VALUES = [
  "SEV1_CHECKOUT_OUTAGE",
  "LATENCY_DEGRADATION",
  "NOISY_ALERT_FALSE_POSITIVE",
  "ROLLBACK_RECOVERY",
] as const;
export type SimulationPreset = (typeof PRESET_VALUES)[number];

export const SIMULATOR_KINDS = ["API_GATEWAY", "AUTH", "CHECKOUT", "SEARCH", "WORKER"] as const;
export type SimulatorKind = (typeof SIMULATOR_KINDS)[number];

export type SimulationFaultState = {
  dbLatencyMultiplier: number;
  externalApiFailureRate: number;
  packetLossEnabled: boolean;
  cpuSaturationEnabled: boolean;
};

export const DEFAULT_SIMULATION_FAULT_STATE: SimulationFaultState = {
  dbLatencyMultiplier: 1,
  externalApiFailureRate: 0,
  packetLossEnabled: false,
  cpuSaturationEnabled: false,
};

export type SimulatorActionDefinition = {
  id: string;
  label: string;
  description: string;
};

export const SIMULATOR_ACTIONS: Record<SimulatorKind, SimulatorActionDefinition[]> = {
  API_GATEWAY: [
    { id: "api-request", label: "Send API Request", description: "Method/path request simulation" },
    { id: "rate-burst", label: "Rate Burst", description: "Normal/high/extreme request surge" },
    {
      id: "dependency-latency",
      label: "Dependency Latency",
      description: "Introduce downstream latency pressure",
    },
  ],
  AUTH: [
    { id: "login-attempts", label: "Login Attempts", description: "Good/bad credential burst" },
    { id: "token-validation", label: "Token Validation", description: "Token verification calls" },
    { id: "auth-store-latency", label: "Auth Store Latency", description: "Auth datastore latency injection" },
  ],
  CHECKOUT: [
    { id: "submit-checkout", label: "Submit Checkout", description: "Payment transaction submission" },
    {
      id: "processor-latency",
      label: "Processor Latency",
      description: "External payment provider delay/failure",
    },
    {
      id: "idempotency-replay",
      label: "Idempotency Replay Storm",
      description: "Replay duplicate requests",
    },
  ],
  SEARCH: [
    { id: "run-query", label: "Run Query", description: "Simple/complex query simulation" },
    { id: "cache-hit-ratio", label: "Cache Hit Ratio", description: "Vary cache effectiveness" },
    { id: "index-lag", label: "Index Lag", description: "Search index update lag" },
  ],
  WORKER: [
    { id: "enqueue-jobs", label: "Enqueue Jobs", description: "Queue intake simulation" },
    { id: "worker-concurrency", label: "Worker Concurrency", description: "Adjust worker pool depth" },
    { id: "dead-letter-toggle", label: "Dead-letter Queue", description: "Enable/disable DLQ flow" },
    { id: "poison-message", label: "Poison Message", description: "Inject non-processable message" },
  ],
};

export function toSimulatorKind(name: string, slug?: string): SimulatorKind {
  const normalized = `${name} ${slug ?? ""}`.toLowerCase();

  if (normalized.includes("gateway")) {
    return "API_GATEWAY";
  }

  if (normalized.includes("auth")) {
    return "AUTH";
  }

  if (
    normalized.includes("checkout") ||
    normalized.includes("billing") ||
    normalized.includes("payment")
  ) {
    return "CHECKOUT";
  }

  if (normalized.includes("search")) {
    return "SEARCH";
  }

  if (
    normalized.includes("worker") ||
    normalized.includes("queue") ||
    normalized.includes("orchestrator")
  ) {
    return "WORKER";
  }

  return "API_GATEWAY";
}

export function outcomeLabel(outcome: SimulationOutcome): string {
  if (outcome === "HEALTHY") {
    return "Healthy success";
  }

  if (outcome === "WARNING") {
    return "Degraded warning";
  }

  return "Hard failure";
}

export function outcomeTone(outcome: SimulationOutcome): "success" | "warning" | "critical" {
  if (outcome === "HEALTHY") {
    return "success";
  }

  if (outcome === "WARNING") {
    return "warning";
  }

  return "critical";
}
