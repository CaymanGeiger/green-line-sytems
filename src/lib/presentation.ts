import type { AlertSeverity, IncidentSeverity, IncidentStatus, ServiceTier } from "@prisma/client";

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

export function computeMttaMinutes(detectedAt: Date | null, acknowledgedAt: Date | null): number {
  return minutesBetween(detectedAt, acknowledgedAt);
}

export function computeMttrMinutes(startedAt: Date, resolvedAt: Date | null): number {
  return minutesBetween(startedAt, resolvedAt);
}
