"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type TeamOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  name: string;
  teamId: string;
};

type EnvironmentOption = {
  id: string;
  name: string;
  serviceId: string;
};

type CreateSavedViewFormProps = {
  teams: TeamOption[];
  services: ServiceOption[];
  environments: EnvironmentOption[];
};

export function CreateSavedViewForm({ teams, services, environments }: CreateSavedViewFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"dashboard" | "incidents">("incidents");
  const [dashboardTeamId, setDashboardTeamId] = useState("");
  const [dashboardServiceId, setDashboardServiceId] = useState("");
  const [dashboardEnvironmentId, setDashboardEnvironmentId] = useState("");
  const [dashboardWindow, setDashboardWindow] = useState("14");
  const [dashboardSimulationOnly, setDashboardSimulationOnly] = useState(false);
  const [incidentsQuery, setIncidentsQuery] = useState("");
  const [incidentsStatus, setIncidentsStatus] = useState("OPEN");
  const [incidentsSeverity, setIncidentsSeverity] = useState("");
  const [incidentsTeamId, setIncidentsTeamId] = useState("");
  const [incidentsServiceId, setIncidentsServiceId] = useState("");
  const [incidentsFrom, setIncidentsFrom] = useState("");
  const [incidentsTo, setIncidentsTo] = useState("");
  const [incidentsSort, setIncidentsSort] = useState("newest");
  const [incidentsSimulationOnly, setIncidentsSimulationOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeTeamId = scope === "dashboard" ? dashboardTeamId : incidentsTeamId;

  const filteredServices = useMemo(() => {
    if (!activeTeamId) {
      return services;
    }
    return services.filter((service) => service.teamId === activeTeamId);
  }, [activeTeamId, services]);

  const filteredEnvironments = useMemo(() => {
    if (!dashboardServiceId) {
      return [];
    }
    return environments.filter((environment) => environment.serviceId === dashboardServiceId);
  }, [dashboardServiceId, environments]);

  useEffect(() => {
    if (dashboardServiceId && !services.some((service) => service.id === dashboardServiceId && (!dashboardTeamId || service.teamId === dashboardTeamId))) {
      setDashboardServiceId("");
      setDashboardEnvironmentId("");
    }
  }, [dashboardServiceId, dashboardTeamId, services]);

  useEffect(() => {
    if (incidentsServiceId && !services.some((service) => service.id === incidentsServiceId && (!incidentsTeamId || service.teamId === incidentsTeamId))) {
      setIncidentsServiceId("");
    }
  }, [incidentsServiceId, incidentsTeamId, services]);

  useEffect(() => {
    if (dashboardEnvironmentId && !filteredEnvironments.some((environment) => environment.id === dashboardEnvironmentId)) {
      setDashboardEnvironmentId("");
    }
  }, [dashboardEnvironmentId, filteredEnvironments]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const filtersJson: Record<string, unknown> = {};

      if (scope === "dashboard") {
        if (dashboardTeamId) filtersJson.teamId = dashboardTeamId;
        if (dashboardServiceId) filtersJson.serviceId = dashboardServiceId;
        if (dashboardEnvironmentId) filtersJson.environmentId = dashboardEnvironmentId;
        filtersJson.window = Number(dashboardWindow);
        if (dashboardSimulationOnly) filtersJson.showSimulation = true;
      } else {
        if (incidentsQuery.trim()) filtersJson.q = incidentsQuery.trim();
        if (incidentsStatus) filtersJson.status = incidentsStatus;
        if (incidentsSeverity) filtersJson.severity = incidentsSeverity;
        if (incidentsTeamId) filtersJson.teamId = incidentsTeamId;
        if (incidentsServiceId) filtersJson.serviceId = incidentsServiceId;
        if (incidentsFrom) filtersJson.from = incidentsFrom;
        if (incidentsTo) filtersJson.to = incidentsTo;
        if (incidentsSort) filtersJson.sort = incidentsSort;
        if (incidentsSimulationOnly) filtersJson.showSimulation = true;
      }

      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          scope,
          filtersJson,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to create saved view");
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setError("Unable to create saved view.");
    } finally {
      setLoading(false);
    }
  }

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
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as "dashboard" | "incidents")}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="dashboard">Dashboard</option>
          <option value="incidents">Incidents</option>
        </select>
      </label>
      {scope === "dashboard" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <select
              value={dashboardTeamId}
              onChange={(event) => setDashboardTeamId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <select
              value={dashboardServiceId}
              onChange={(event) => setDashboardServiceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All services</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Environment
            <select
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
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time window
            <select
              value={dashboardWindow}
              onChange={(event) => setDashboardWindow(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="1">24h</option>
              <option value="7">7d</option>
              <option value="14">14d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
            </select>
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
            <select
              value={incidentsStatus}
              onChange={(event) => setIncidentsStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All status</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="MITIGATED">MITIGATED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severity
            <select
              value={incidentsSeverity}
              onChange={(event) => setIncidentsSeverity(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All severities</option>
              <option value="SEV1">SEV1</option>
              <option value="SEV2">SEV2</option>
              <option value="SEV3">SEV3</option>
              <option value="SEV4">SEV4</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <select
              value={incidentsTeamId}
              onChange={(event) => setIncidentsTeamId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <select
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
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sort
            <select
              value={incidentsSort}
              onChange={(event) => setIncidentsSort(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="severity">Severity</option>
              <option value="time-open">Time open</option>
            </select>
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
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save view"}
      </Button>
    </form>
  );
}
