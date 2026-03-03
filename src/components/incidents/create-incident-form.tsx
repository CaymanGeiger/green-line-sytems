"use client";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { useCreateIncidentForm } from "@/hooks/use-create-incident-form";

type TeamOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; teamId: string };
type UserOption = { id: string; name: string };

type Props = {
  teams: TeamOption[];
  services: ServiceOption[];
  users: UserOption[];
};

export function CreateIncidentForm({ teams, services, users }: Props) {
  const {
    teamId,
    serviceId,
    title,
    severity,
    summary,
    impact,
    commanderUserId,
    error,
    loading,
    filteredServices,
    onSubmit,
    onTeamChange,
    setServiceId,
    setTitle,
    setSeverity,
    setSummary,
    setImpact,
    setCommanderUserId,
  } = useCreateIncidentForm({ teams, services });

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team
        <AppSelect
          required
          value={teamId}
          onChange={(event) => onTeamChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </AppSelect>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Service
        <AppSelect
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
        </AppSelect>
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
        <AppSelect
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="SEV1">SEV1</option>
          <option value="SEV2">SEV2</option>
          <option value="SEV3">SEV3</option>
          <option value="SEV4">SEV4</option>
        </AppSelect>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Commander
        <AppSelect
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
        </AppSelect>
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
        <Button type="submit" loading={loading} loadingText="Creating...">
          Create incident
        </Button>
      </div>
    </form>
  );
}
