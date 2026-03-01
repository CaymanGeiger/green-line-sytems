"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type TeamOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; teamId: string };
type UserOption = { id: string; name: string };

type Props = {
  teams: TeamOption[];
  services: ServiceOption[];
  users: UserOption[];
};

export function CreateIncidentForm({ teams, services, users }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("SEV2");
  const [summary, setSummary] = useState("");
  const [impact, setImpact] = useState("");
  const [commanderUserId, setCommanderUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = useMemo(
    () => services.filter((service) => !teamId || service.teamId === teamId),
    [services, teamId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          serviceId: serviceId || null,
          title,
          severity,
          summary: summary || null,
          impact: impact || null,
          commanderUserId: commanderUserId || null,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to create incident");
        return;
      }

      setTitle("");
      setSummary("");
      setImpact("");
      setServiceId("");
      setCommanderUserId("");
      router.refresh();
    } catch {
      setError("Unable to create incident");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team
        <select
          required
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setServiceId("");
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Service
        <select
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Not linked</option>
          {filteredServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Severity
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="SEV1">SEV1</option>
          <option value="SEV2">SEV2</option>
          <option value="SEV3">SEV3</option>
          <option value="SEV4">SEV4</option>
        </select>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Commander
        <select
          value={commanderUserId}
          onChange={(event) => setCommanderUserId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Summary
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Impact
        <textarea
          value={impact}
          onChange={(event) => setImpact(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </label>

      {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create incident"}
        </Button>
      </div>
    </form>
  );
}
