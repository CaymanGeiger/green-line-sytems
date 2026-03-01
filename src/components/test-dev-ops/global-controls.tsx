"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useUiBooleanPreference } from "@/components/ui/ui-preferences-provider";
import { useTestDevOps } from "@/components/test-dev-ops/test-devops-provider";
import {
  PRESET_VALUES,
  SIMULATION_SEVERITY_OVERRIDE_VALUES,
  type SimulationPreset,
  type SimulationSeverityOverride,
} from "@/lib/test-dev-ops";

const PRESET_LABELS: Record<SimulationPreset, string> = {
  SEV1_CHECKOUT_OUTAGE: "SEV1 Checkout Outage",
  LATENCY_DEGRADATION: "Latency Degradation",
  NOISY_ALERT_FALSE_POSITIVE: "Noisy Alert False Positive",
  ROLLBACK_RECOVERY: "Rollback Recovery",
};

export function GlobalControls({
  teamId,
  services,
  canRunPresets = true,
  canResolveEvents = true,
  canDeleteData = true,
}: {
  teamId: string;
  services: Array<{ id: string; name: string }>;
  canRunPresets?: boolean;
  canResolveEvents?: boolean;
  canDeleteData?: boolean;
}) {
  const { profile, setProfile, severityOverride, setSeverityOverride, faults, setFaults, resetFaults } =
    useTestDevOps();
  const quickActionsStorageKey = `test-dev-ops:quick-actions-open:${teamId}`;
  const [quickActionsOpen, setQuickActionsOpen] = useUiBooleanPreference(quickActionsStorageKey, false);
  const [presetServiceId, setPresetServiceId] = useState(services[0]?.id ?? "");
  const [presetRunCount, setPresetRunCount] = useState(1);
  const [loadingPreset, setLoadingPreset] = useState<SimulationPreset | null>(null);
  const [resolving, setResolving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPreset(preset: SimulationPreset) {
    if (!canRunPresets) {
      setError("You do not have permission to run simulator presets.");
      return;
    }

    setLoadingPreset(preset);
    setError(null);
    setFeedback(null);

    let totalSteps = 0;

    try {
      for (let runIndex = 0; runIndex < presetRunCount; runIndex += 1) {
        const response = await fetch("/api/test-dev-ops/preset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId,
            preset,
            serviceId: presetServiceId || null,
            profile,
            severityOverride,
            faults,
          }),
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body.error ?? "Unable to run preset");
          return;
        }

        totalSteps += Number(body.result?.stepsRun ?? 0);
      }

      const runSuffix = presetRunCount > 1 ? ` x${presetRunCount}` : "";
      setFeedback(`Preset '${PRESET_LABELS[preset]}' executed${runSuffix} (${totalSteps} total steps).`);
    } catch {
      setError("Unable to run preset");
    } finally {
      setLoadingPreset(null);
    }
  }

  function clearSimulationSettings() {
    setProfile("SAFE_DEMO");
    setSeverityOverride("AUTO");
    resetFaults();
    setPresetServiceId(services[0]?.id ?? "");
    setPresetRunCount(1);
    setError(null);
    setFeedback("Simulation settings cleared.");
  }

  async function markSimulationEventsResolved() {
    if (!canResolveEvents) {
      setError("You do not have permission to resolve simulator events.");
      return;
    }

    setResolving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/test-dev-ops/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to resolve simulation events");
        return;
      }

      setFeedback(
        `${body.result.incidentsResolved} incidents and ${body.result.alertsResolved} alerts marked resolved.`,
      );
    } catch {
      setError("Unable to resolve simulation events");
    } finally {
      setResolving(false);
    }
  }

  async function deleteAllSimulationData() {
    if (!canDeleteData) {
      setError("You do not have permission to delete simulator data.");
      return;
    }

    if (!window.confirm("Delete all simulation incidents/events for this team? This cannot be undone.")) {
      return;
    }

    setPurging(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/test-dev-ops/purge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to delete simulation data");
        return;
      }

      setFeedback(
        `Deleted ${body.result.incidentsDeleted} incidents, ${body.result.alertsDeleted} alerts, ${body.result.errorsDeleted} errors, ${body.result.logsDeleted} logs, and ${body.result.deploysDeleted} deploys.`,
      );
    } catch {
      setError("Unable to delete simulation data");
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Profile
          <select
            value={profile}
            onChange={(event) => setProfile(event.target.value as typeof profile)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="SAFE_DEMO">Safe Demo</option>
            <option value="HIGH_TRAFFIC">High Traffic</option>
            <option value="RELEASE_DAY">Release Day</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          DB latency multiplier
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={faults.dbLatencyMultiplier}
            onChange={(event) =>
              setFaults({
                ...faults,
                dbLatencyMultiplier: Number.parseInt(event.target.value, 10),
              })
            }
            className="mt-3 w-full"
          />
          <p className="text-xs text-slate-500">x{faults.dbLatencyMultiplier.toFixed(0)}</p>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          External API failure rate
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={faults.externalApiFailureRate}
            onChange={(event) =>
              setFaults({
                ...faults,
                externalApiFailureRate: Number.parseInt(event.target.value, 10),
              })
            }
            className="mt-3 w-full"
          />
          <p className="text-xs text-slate-500">{faults.externalApiFailureRate}%</p>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={faults.packetLossEnabled}
            onChange={(event) =>
              setFaults({
                ...faults,
                packetLossEnabled: event.target.checked,
              })
            }
          />
          Packet loss
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={faults.cpuSaturationEnabled}
            onChange={(event) =>
              setFaults({
                ...faults,
                cpuSaturationEnabled: event.target.checked,
              })
            }
          />
          CPU saturation
        </label>

        <Button type="button" variant="secondary" onClick={clearSimulationSettings}>
          Clear simulation settings
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={markSimulationEventsResolved}
          disabled={resolving || purging || !canResolveEvents}
        >
          {resolving ? "Resolving..." : "Mark all simulation events resolved"}
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={deleteAllSimulationData}
          disabled={purging || resolving || !canDeleteData}
        >
          {purging ? "Deleting..." : "Delete all simulation data"}
        </Button>
      </div>

      {(!canRunPresets || !canResolveEvents || !canDeleteData) ? (
        <p className="text-xs text-slate-500">
          Some simulator controls are disabled by team permissions.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setQuickActionsOpen(!quickActionsOpen)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">Quick simulation actions</p>
            <p className="text-xs text-slate-600">
              One-click incident stories for fast demos without advanced setup.
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-500">{quickActionsOpen ? "Hide" : "Show"}</span>
        </button>

        {quickActionsOpen ? (
          <div className="space-y-3 border-t border-slate-200 px-4 py-3">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preset target service
                <select
                  value={presetServiceId}
                  onChange={(event) => setPresetServiceId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={!canRunPresets}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Severity override
                <select
                  value={severityOverride}
                  onChange={(event) => setSeverityOverride(event.target.value as SimulationSeverityOverride)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={!canRunPresets}
                >
                  {SIMULATION_SEVERITY_OVERRIDE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value === "AUTO" ? "Auto (by scenario)" : value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Run count
                <select
                  value={String(presetRunCount)}
                  onChange={(event) => setPresetRunCount(Number.parseInt(event.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={!canRunPresets}
                >
                  <option value="1">1x</option>
                  <option value="2">2x burst</option>
                  <option value="3">3x burst</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_VALUES.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="secondary"
                  disabled={loadingPreset !== null || !canRunPresets}
                  onClick={() => runPreset(preset)}
                >
                  {loadingPreset === preset ? "Running..." : PRESET_LABELS[preset]}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
