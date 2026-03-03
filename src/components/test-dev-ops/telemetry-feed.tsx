"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LoadingInline } from "@/components/ui/loading-spinner";

type FeedItem = {
  id: string;
  type: "LOG" | "ERROR" | "DEPLOY" | "ALERT" | "INCIDENT";
  serviceId?: string;
  serviceName?: string;
  incidentId?: string;
  incidentKey?: string;
  level?: string;
  message: string;
  timestamp: string;
};

function toneForType(type: FeedItem["type"]): "info" | "warning" | "danger" | "critical" | "success" {
  if (type === "LOG") {
    return "info";
  }

  if (type === "ERROR") {
    return "danger";
  }

  if (type === "DEPLOY") {
    return "success";
  }

  if (type === "ALERT") {
    return "warning";
  }

  return "critical";
}

function toneForLevel(level: string): "success" | "warning" | "danger" | "critical" | "info" {
  const normalized = level.toUpperCase();

  if (normalized === "FATAL" || normalized === "CRITICAL" || normalized === "SEV1") {
    return "critical";
  }

  if (
    normalized === "ERROR" ||
    normalized === "FAILED" ||
    normalized === "TRIGGERED" ||
    normalized === "OPEN" ||
    normalized === "SEV2"
  ) {
    return "danger";
  }

  if (
    normalized === "WARNING" ||
    normalized === "WARN" ||
    normalized === "ACKED" ||
    normalized === "STARTED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "MITIGATED" ||
    normalized === "ROLLED_BACK" ||
    normalized === "SEV3"
  ) {
    return "warning";
  }

  if (normalized === "SUCCEEDED" || normalized === "RESOLVED" || normalized === "DONE") {
    return "success";
  }

  return "info";
}

export function TelemetryFeed({ teamId }: { teamId: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const response = await fetch(`/api/test-dev-ops/feed?teamId=${teamId}`, {
          cache: "no-store",
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load telemetry feed");
        }

        if (!active) {
          return;
        }

        setItems(Array.isArray(body.items) ? body.items : []);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load telemetry feed");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFeed();
    const interval = window.setInterval(() => {
      void loadFeed();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [teamId]);

  if (loading) {
    return <LoadingInline label="Loading telemetry feed..." />;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No simulator telemetry yet. Trigger a service action.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={toneForType(item.type)}>{item.type}</Badge>
            <p className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
          </div>
          <p className="mt-1 text-sm text-slate-800">{item.message}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {item.level ? <Badge tone={toneForLevel(item.level)}>{item.level}</Badge> : null}
            {item.serviceId && item.serviceName ? (
              <Link href={`/services/${item.serviceId}`} className="font-semibold text-green-700 hover:text-green-800">
                {item.serviceName}
              </Link>
            ) : null}
            {item.incidentId && item.incidentKey ? (
              <Link href={`/incidents/${item.incidentId}`} className="font-semibold text-green-700 hover:text-green-800">
                {item.incidentKey}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
