"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useTestDevOps } from "@/components/test-dev-ops/test-devops-provider";
import { Button } from "@/components/ui/button";
import {
  SIMULATION_SEVERITY_OVERRIDE_VALUES,
  SIMULATOR_ACTIONS,
  type SimulationOutcome,
  type SimulationSeverityOverride,
  toSimulatorKind,
} from "@/lib/test-dev-ops";

type SimulatorResult = {
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

const OUTCOMES: SimulationOutcome[] = ["HEALTHY", "WARNING", "FAILURE"];

export function ServiceSimulator({
  service,
  canSimulate = true,
}: {
  service: {
    id: string;
    name: string;
    slug: string;
  };
  canSimulate?: boolean;
}) {
  const { profile, severityOverride, setSeverityOverride, faults } = useTestDevOps();
  const kind = toSimulatorKind(service.name, service.slug);
  const actionOptions = SIMULATOR_ACTIONS[kind];

  const [action, setAction] = useState(actionOptions[0]?.id ?? "");
  const [expectedOutcome, setExpectedOutcome] = useState<SimulationOutcome>("HEALTHY");
  const [intensity, setIntensity] = useState(3);

  const [method, setMethod] = useState("POST");
  const [path, setPath] = useState("/api/v1/orders");
  const [payloadSizeKb, setPayloadSizeKb] = useState(4);
  const [burstMode, setBurstMode] = useState("normal");
  const [dependencyLatencyMs, setDependencyLatencyMs] = useState(600);

  const [loginMode, setLoginMode] = useState("good-creds");
  const [tokenChecksPerMinute, setTokenChecksPerMinute] = useState(120);
  const [authStoreLatencyMs, setAuthStoreLatencyMs] = useState(800);

  const [amountUsd, setAmountUsd] = useState(189.99);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processorState, setProcessorState] = useState("stable");
  const [replayCount, setReplayCount] = useState(3);

  const [queryType, setQueryType] = useState("simple");
  const [cacheHitRatio, setCacheHitRatio] = useState(85);
  const [indexLagSeconds, setIndexLagSeconds] = useState(20);

  const [jobsEnqueued, setJobsEnqueued] = useState(300);
  const [workerConcurrency, setWorkerConcurrency] = useState(18);
  const [deadLetterEnabled, setDeadLetterEnabled] = useState(true);
  const [poisonMessageEnabled, setPoisonMessageEnabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulatorResult | null>(null);

  const payload = useMemo(() => {
    if (kind === "API_GATEWAY") {
      return {
        method,
        path,
        payloadSizeKb,
        burstMode,
        dependencyLatencyMs,
      };
    }

    if (kind === "AUTH") {
      return {
        loginMode,
        tokenChecksPerMinute,
        authStoreLatencyMs,
      };
    }

    if (kind === "CHECKOUT") {
      return {
        amountUsd,
        paymentMethod,
        processorState,
        replayCount,
      };
    }

    if (kind === "SEARCH") {
      return {
        queryType,
        cacheHitRatio,
        indexLagSeconds,
      };
    }

    return {
      jobsEnqueued,
      workerConcurrency,
      deadLetterEnabled,
      poisonMessageEnabled,
    };
  }, [
    kind,
    method,
    path,
    payloadSizeKb,
    burstMode,
    dependencyLatencyMs,
    loginMode,
    tokenChecksPerMinute,
    authStoreLatencyMs,
    amountUsd,
    paymentMethod,
    processorState,
    replayCount,
    queryType,
    cacheHitRatio,
    indexLagSeconds,
    jobsEnqueued,
    workerConcurrency,
    deadLetterEnabled,
    poisonMessageEnabled,
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSimulate) {
      setError("You do not have permission to run simulator actions for this team.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/test-dev-ops/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: service.id,
          action,
          expectedOutcome,
          intensity,
          profile,
          severityOverride,
          payload,
          faults,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to run service simulation");
        return;
      }

      setResult(body.result as SimulatorResult);
    } catch {
      setError("Unable to run service simulation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={onSubmit}>
        <fieldset disabled={!canSimulate} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Action
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {actionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outcome
            <select
              value={expectedOutcome}
              onChange={(event) => setExpectedOutcome(event.target.value as SimulationOutcome)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {outcome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Intensity ({intensity})
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={intensity}
              onChange={(event) => setIntensity(Number.parseInt(event.target.value, 10))}
              className="mt-3 w-full"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severity override
            <select
              value={severityOverride}
              onChange={(event) => setSeverityOverride(event.target.value as SimulationSeverityOverride)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {SIMULATION_SEVERITY_OVERRIDE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === "AUTO" ? "Auto (by scenario)" : value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {kind === "API_GATEWAY" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Method
              <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Path
              <input value={path} onChange={(event) => setPath(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payload size (KB)
              <input type="number" min={1} value={payloadSizeKb} onChange={(event) => setPayloadSizeKb(Number.parseInt(event.target.value, 10) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Burst mode
              <select value={burstMode} onChange={(event) => setBurstMode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="extreme">extreme</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
              Downstream dependency latency (ms)
              <input type="number" min={0} value={dependencyLatencyMs} onChange={(event) => setDependencyLatencyMs(Number.parseInt(event.target.value, 10) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
        ) : null}

        {kind === "AUTH" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Login mode
              <select value={loginMode} onChange={(event) => setLoginMode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="good-creds">good-creds</option>
                <option value="bad-creds-burst">bad-creds-burst</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Token validations / min
              <input type="number" min={1} value={tokenChecksPerMinute} onChange={(event) => setTokenChecksPerMinute(Number.parseInt(event.target.value, 10) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
              Auth store latency (ms)
              <input type="number" min={0} value={authStoreLatencyMs} onChange={(event) => setAuthStoreLatencyMs(Number.parseInt(event.target.value, 10) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
        ) : null}

        {kind === "CHECKOUT" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Amount (USD)
              <input type="number" min={1} step={0.01} value={amountUsd} onChange={(event) => setAmountUsd(Number.parseFloat(event.target.value) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="card">card</option>
                <option value="ach">ach</option>
                <option value="wallet">wallet</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Processor state
              <select value={processorState} onChange={(event) => setProcessorState(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="stable">stable</option>
                <option value="slow">slow</option>
                <option value="failing">failing</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Replay count
              <input type="number" min={0} value={replayCount} onChange={(event) => setReplayCount(Number.parseInt(event.target.value, 10) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
        ) : null}

        {kind === "SEARCH" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Query type
              <select value={queryType} onChange={(event) => setQueryType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="simple">simple</option>
                <option value="complex">complex</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cache hit ratio (%)
              <input type="number" min={0} max={100} value={cacheHitRatio} onChange={(event) => setCacheHitRatio(Number.parseInt(event.target.value, 10) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
              Index lag (seconds)
              <input type="number" min={0} value={indexLagSeconds} onChange={(event) => setIndexLagSeconds(Number.parseInt(event.target.value, 10) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
        ) : null}

        {kind === "WORKER" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Jobs enqueued
              <input type="number" min={1} value={jobsEnqueued} onChange={(event) => setJobsEnqueued(Number.parseInt(event.target.value, 10) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Worker concurrency
              <input type="number" min={1} value={workerConcurrency} onChange={(event) => setWorkerConcurrency(Number.parseInt(event.target.value, 10) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={deadLetterEnabled} onChange={(event) => setDeadLetterEnabled(event.target.checked)} />
              Dead-letter queue enabled
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={poisonMessageEnabled} onChange={(event) => setPoisonMessageEnabled(event.target.checked)} />
              Inject poison message
            </label>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </fieldset>

        {!canSimulate ? <p className="text-sm text-slate-500">You have view-only simulator access for this team.</p> : null}

        <Button type="submit" disabled={loading || !canSimulate}>
          {loading ? "Running simulation..." : "Run simulation action"}
        </Button>
      </form>

      {result ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Simulated outcome</h3>
          <p className="mt-1 text-sm text-slate-700">
            HTTP {result.simulatedResponse.statusCode} · {result.simulatedResponse.summary}
          </p>
          <ul className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            <li>{result.logsWritten} log events</li>
            <li>{result.errorWritten ? "error event written" : "no error event"}</li>
            <li>{result.alertWritten ? "alert written" : "no alert"}</li>
            <li>{result.deployWritten ? "deploy event written" : "no deploy event"}</li>
          </ul>
          {result.incidentId && result.incidentKey ? (
            <Link href={`/incidents/${result.incidentId}`} className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800">
              Open incident {result.incidentKey}
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
