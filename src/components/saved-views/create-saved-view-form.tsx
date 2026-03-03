"use client";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import {
  useCreateSavedViewForm,
  type EnvironmentOption,
  type ServiceOption,
  type TeamOption,
} from "@/hooks/use-create-saved-view-form";

type CreateSavedViewFormProps = {
  teams: TeamOption[];
  services: ServiceOption[];
  environments: EnvironmentOption[];
};

export function CreateSavedViewForm({ teams, services, environments }: CreateSavedViewFormProps) {
  const {
    name,
    scope,
    dashboardTeamId,
    dashboardServiceId,
    dashboardEnvironmentId,
    dashboardWindow,
    dashboardSimulationOnly,
    incidentsQuery,
    incidentsStatus,
    incidentsSeverity,
    incidentsTeamId,
    incidentsServiceId,
    incidentsFrom,
    incidentsTo,
    incidentsSort,
    incidentsSimulationOnly,
    error,
    loading,
    filteredServices,
    filteredEnvironments,
    setName,
    onScopeChange,
    onDashboardTeamChange,
    onDashboardServiceChange,
    setDashboardEnvironmentId,
    setDashboardWindow,
    setDashboardSimulationOnly,
    setIncidentsQuery,
    setIncidentsStatus,
    setIncidentsSeverity,
    onIncidentsTeamChange,
    setIncidentsServiceId,
    setIncidentsFrom,
    setIncidentsTo,
    setIncidentsSort,
    setIncidentsSimulationOnly,
    onSubmit,
  } = useCreateSavedViewForm({ services, environments });

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Scope
        <AppSelect
          value={scope}
          onChange={(event) => onScopeChange(event.target.value as "dashboard" | "incidents")}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="dashboard">Dashboard</option>
          <option value="incidents">Incidents</option>
        </AppSelect>
      </label>
      {scope === "dashboard" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <AppSelect
              value={dashboardTeamId}
              onChange={(event) => onDashboardTeamChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <AppSelect
              value={dashboardServiceId}
              onChange={(event) => onDashboardServiceChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All services</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Environment
            <AppSelect
              value={dashboardEnvironmentId}
              onChange={(event) => setDashboardEnvironmentId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All environments</option>
              {filteredEnvironments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time window
            <AppSelect
              value={dashboardWindow}
              onChange={(event) => setDashboardWindow(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="1">24h</option>
              <option value="7">7d</option>
              <option value="14">14d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
            </AppSelect>
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <input
              type="checkbox"
              checked={dashboardSimulationOnly}
              onChange={(event) => setDashboardSimulationOnly(event.target.checked)}
              className="h-3.5 w-3.5"
            />
            Simulation metrics only
          </label>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
            <input
              value={incidentsQuery}
              onChange={(event) => setIncidentsQuery(event.target.value)}
              placeholder="Incident key, title, summary"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <AppSelect
              value={incidentsStatus}
              onChange={(event) => setIncidentsStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All status</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="MITIGATED">MITIGATED</option>
              <option value="RESOLVED">RESOLVED</option>
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severity
            <AppSelect
              value={incidentsSeverity}
              onChange={(event) => setIncidentsSeverity(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All severities</option>
              <option value="SEV1">SEV1</option>
              <option value="SEV2">SEV2</option>
              <option value="SEV3">SEV3</option>
              <option value="SEV4">SEV4</option>
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <AppSelect
              value={incidentsTeamId}
              onChange={(event) => onIncidentsTeamChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <AppSelect
              value={incidentsServiceId}
              onChange={(event) => setIncidentsServiceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All services</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sort
            <AppSelect
              value={incidentsSort}
              onChange={(event) => setIncidentsSort(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="severity">Severity</option>
              <option value="time-open">Time open</option>
            </AppSelect>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            From date
            <input
              type="date"
              value={incidentsFrom}
              onChange={(event) => setIncidentsFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To date
            <input
              type="date"
              value={incidentsTo}
              onChange={(event) => setIncidentsTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <input
              type="checkbox"
              checked={incidentsSimulationOnly}
              onChange={(event) => setIncidentsSimulationOnly(event.target.checked)}
              className="h-3.5 w-3.5"
            />
            Simulation metrics only
          </label>
        </div>
      )}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" loading={loading} loadingText="Saving...">
        Save view
      </Button>
    </form>
  );
}
