import type {
  AlertSeverity,
  AlertStatus,
  DeployStatus,
  ErrorLevel,
  IncidentSeverity,
  IncidentStatus,
  ServiceTier,
} from "@prisma/client";

import { minutesBetween } from "@/lib/utils";

export function incidentSeverityTone(severity: IncidentSeverity):
  | "critical"
  | "danger"
  | "warning"
  | "info" {
  switch (severity) {
    case "SEV1":
      return "critical";
    case "SEV2":
      return "danger";
    case "SEV3":
      return "warning";
    case "SEV4":
      return "info";
    default:
      return "info";
  }
}

export function incidentStatusTone(status: IncidentStatus): "open" | "warning" | "info" | "resolved" {
  switch (status) {
    case "OPEN":
      return "open";
    case "INVESTIGATING":
      return "warning";
    case "MITIGATED":
      return "info";
    case "RESOLVED":
      return "resolved";
    default:
      return "info";
  }
}

export function alertSeverityTone(severity: AlertSeverity): "critical" | "danger" | "warning" | "info" {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "info";
  }
}

export function alertStatusTone(status: AlertStatus): "danger" | "warning" | "resolved" {
  switch (status) {
    case "TRIGGERED":
      return "danger";
    case "ACKED":
      return "warning";
    case "RESOLVED":
      return "resolved";
    default:
      return "warning";
  }
}

export function errorLevelTone(level: ErrorLevel): "critical" | "danger" | "warning" {
  switch (level) {
    case "FATAL":
      return "critical";
    case "ERROR":
      return "danger";
    case "WARNING":
      return "warning";
    default:
      return "warning";
  }
}

export function serviceTierTone(tier: ServiceTier): "critical" | "danger" | "warning" | "info" {
  switch (tier) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "info";
  }
}

export function deployStatusTone(status: DeployStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "SUCCEEDED":
      return "success";
    case "FAILED":
      return "danger";
    case "STARTED":
    case "ROLLED_BACK":
      return "warning";
    default:
      return "warning";
  }
}

export function computeMttaMinutes(detectedAt: Date | null, acknowledgedAt: Date | null): number {
  return minutesBetween(detectedAt, acknowledgedAt);
}

export function computeMttrMinutes(startedAt: Date, resolvedAt: Date | null): number {
  return minutesBetween(startedAt, resolvedAt);
}
