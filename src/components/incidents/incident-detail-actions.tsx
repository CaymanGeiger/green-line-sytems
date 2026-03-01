"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type IncidentDetailActionsProps = {
  incidentId: string;
  currentStatus: string;
  currentSeverity: string;
};

export function IncidentDetailActions({ incidentId, currentStatus, currentSeverity }: IncidentDetailActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [severity, setSeverity] = useState(currentSeverity);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function updateIncident(payload: Record<string, unknown>) {
    const response = await fetch(`/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Unable to update incident");
    }
  }

  async function addTimelineNote(message: string) {
    const response = await fetch(`/api/incidents/${incidentId}/timeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "NOTE", message }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Unable to add note");
    }
  }

  async function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateIncident({ status });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update incident");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeverity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateIncident({ severity });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update incident");
    } finally {
      setLoading(false);
    }
  }

  async function handleNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addTimelineNote(note.trim());
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleStatus} className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Status change</label>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <Button type="submit" variant="secondary" disabled={loading}>
            Save
          </Button>
        </div>
      </form>

      <form onSubmit={handleSeverity} className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Severity change</label>
        <div className="flex items-center gap-2">
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="SEV1">SEV1</option>
            <option value="SEV2">SEV2</option>
            <option value="SEV3">SEV3</option>
            <option value="SEV4">SEV4</option>
          </select>
          <Button type="submit" variant="secondary" disabled={loading}>
            Save
          </Button>
        </div>
      </form>

      <form onSubmit={handleNote} className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Add note</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Timeline update..."
        />
        <Button type="submit" disabled={loading}>
          Post note
        </Button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
