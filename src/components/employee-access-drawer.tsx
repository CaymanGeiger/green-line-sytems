"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { LoadingInline } from "@/components/ui/loading-spinner";
import { EMPLOYEE_ACCESS_DRAWER_OPEN_EVENT } from "@/lib/employee-access/shared";

type OrganizationOption = {
  id: string;
  name: string;
  actorRole: "OWNER" | "ADMIN";
  teams: Array<{
    id: string;
    name: string;
  }>;
};

type ResolvedRequest = {
  email: string;
  requesterName: string | null;
  requesterEmail: string;
  expiresAt: string;
};

type RoleChoice = "MEMBER" | "ADMIN";

export function EmployeeAccessDrawer() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OrganizationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [linkInput, setLinkInput] = useState("");
  const [resolved, setResolved] = useState<ResolvedRequest | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const [organizationRoles, setOrganizationRoles] = useState<Record<string, RoleChoice | undefined>>({});
  const [teamRoles, setTeamRoles] = useState<Record<string, RoleChoice | undefined>>({});

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener(EMPLOYEE_ACCESS_DRAWER_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(EMPLOYEE_ACCESS_DRAWER_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !resolved || options.length > 0) {
      return;
    }

    let active = true;
    setOptionsLoading(true);
    setOptionsError(null);

    fetch("/api/account/employee-access/options")
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load organization options");
        }
        return body;
      })
      .then((body) => {
        if (!active) {
          return;
        }
        setOptions(body.organizations ?? []);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }
        setOptionsError(nextError instanceof Error ? nextError.message : "Unable to load organization options");
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, resolved, options.length]);

  const selectedOrganizationIds = useMemo(
    () =>
      Object.entries(organizationRoles)
        .filter(([, role]) => role)
        .map(([organizationId]) => organizationId),
    [organizationRoles],
  );

  const selectedOrganizationIdSet = useMemo(() => new Set(selectedOrganizationIds), [selectedOrganizationIds]);
  const selectedTeamAssignments = useMemo(
    () =>
      Object.entries(teamRoles)
        .filter(([, role]) => role)
        .map(([teamId, role]) => ({ teamId, role: role as RoleChoice })),
    [teamRoles],
  );

  function closeDrawer() {
    setOpen(false);
  }

  function teamIdsForOrganization(organizationId: string) {
    return options.find((organization) => organization.id === organizationId)?.teams.map((team) => team.id) ?? [];
  }

  function applyOrganizationAdminTeamRoles(organizationId: string) {
    const teamIds = teamIdsForOrganization(organizationId);
    if (teamIds.length === 0) {
      return;
    }

    setTeamRoles((current) => {
      const next = { ...current };
      teamIds.forEach((teamId) => {
        next[teamId] = "ADMIN";
      });
      return next;
    });
  }

  function setOrganizationRole(organizationId: string, role: RoleChoice) {
    setOrganizationRoles((current) => ({
      ...current,
      [organizationId]: role,
    }));

    if (role === "ADMIN") {
      applyOrganizationAdminTeamRoles(organizationId);
    }
  }

  function toggleOrganization(organizationId: string, checked: boolean) {
    const currentRole = organizationRoles[organizationId] ?? "MEMBER";
    const nextRole = checked ? currentRole : undefined;
    setOrganizationRoles((current) => ({
      ...current,
      [organizationId]: nextRole,
    }));

    if (checked && nextRole === "ADMIN") {
      applyOrganizationAdminTeamRoles(organizationId);
      return;
    }

    if (!checked) {
      const teamIds = teamIdsForOrganization(organizationId);
      if (teamIds.length > 0) {
        setTeamRoles((current) => {
          const next = { ...current };
          teamIds.forEach((teamId) => {
            next[teamId] = undefined;
          });
          return next;
        });
      }
    }
  }

  function toggleTeam(teamId: string, checked: boolean) {
    setTeamRoles((current) => ({
      ...current,
      [teamId]: checked ? current[teamId] ?? "MEMBER" : undefined,
    }));
  }

  async function resolveLink() {
    if (!linkInput.trim()) {
      setError("Paste an employee access link first.");
      return;
    }

    setResolveLoading(true);
    setError(null);
    setSuccess(null);
    setResolved(null);

    try {
      const response = await fetch("/api/account/employee-access/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link: linkInput,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to resolve invitation link.");
        return;
      }

      setResolved(body.request);
    } catch {
      setError("Unable to resolve invitation link.");
    } finally {
      setResolveLoading(false);
    }
  }

  async function sendVerification() {
    if (!resolved) {
      setError("Resolve an employee access link first.");
      return;
    }
    if (selectedOrganizationIds.length === 0) {
      setError("Select at least one organization to grant.");
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/employee-access/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link: linkInput,
          organizations: selectedOrganizationIds.map((organizationId) => ({
            organizationId,
            role: organizationRoles[organizationId] ?? "MEMBER",
          })),
          teams: selectedTeamAssignments,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to send verification email.");
        return;
      }

      const deliveryMessage = typeof body.deliveryId === "string" && body.deliveryId
        ? ` Delivery id: ${body.deliveryId}.`
        : "";
      setSuccess(
        `Verification sent to ${body.email}. Once they click it, access is automatically applied.${deliveryMessage}`,
      );
    } catch {
      setError("Unable to send verification email.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        aria-label="Close employee access drawer"
        onClick={closeDrawer}
        className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-lg border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Use employee access link"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Employee Access</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Use employee access link</h2>
              <p className="mt-1 text-sm text-slate-600">
                Paste an employee link, choose organizations/teams, and send one-click verification.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {resolved && optionsError ? <p className="text-sm text-rose-700">{optionsError}</p> : null}

            <section className="space-y-2">
              <label htmlFor="employee-access-link" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee access link
              </label>
              <textarea
                id="employee-access-link"
                value={linkInput}
                onChange={(event) => {
                  setLinkInput(event.target.value);
                  setResolved(null);
                  setSuccess(null);
                }}
                rows={3}
                placeholder="Paste the employee's request link"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <Button
                type="button"
                onClick={resolveLink}
                disabled={!linkInput.trim()}
                loading={resolveLoading}
                loadingText="Resolving..."
                className="inline-flex h-10 items-center justify-center px-4 text-sm"
              >
                Resolve link
              </Button>
            </section>

            {resolved ? (
              <div className="rounded-lg border border-green-200 bg-green-50/50 px-3 py-3">
                <p className="text-sm font-semibold text-green-800">Link is valid</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{resolved.email}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Requested by {resolved.requesterName ?? "employee"} · link expires {new Date(resolved.expiresAt).toLocaleString()}
                </p>
                <p className="mt-2 text-xs font-medium text-green-700">
                  Next: select organization/team access below, then click Confirm and send verification.
                </p>
              </div>
            ) : null}

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign organizations and teams</p>
              {!resolved ? <p className="text-sm text-slate-500">Resolve an employee link to load assignable organizations.</p> : null}
              {resolved && optionsLoading ? <LoadingInline label="Loading organizations..." /> : null}
              {resolved && options.length === 0 && !optionsLoading ? (
                <p className="text-sm text-slate-500">No manageable organizations available for your account.</p>
              ) : null}

              {resolved
                ? options.map((organization) => {
                const selectedOrgRole = organizationRoles[organization.id];
                const organizationSelected = Boolean(selectedOrgRole);
                const organizationAdminLocked = selectedOrgRole === "ADMIN";

                return (
                  <article key={organization.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={organizationSelected}
                          onChange={(event) => toggleOrganization(organization.id, event.target.checked)}
                          className="h-4 w-4 rounded border border-slate-400 accent-green-700"
                        />
                        {organization.name}
                      </label>
                      {organizationSelected ? (
                        <div className="w-[190px]">
                          <AppSelect
                            value={selectedOrgRole ?? "MEMBER"}
                            onChange={(event) => setOrganizationRole(organization.id, event.target.value as RoleChoice)}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[9px] font-semibold tracking-wide"
                          >
                            <option value="MEMBER">ORG MEMBER</option>
                            <option value="ADMIN" disabled={organization.actorRole !== "OWNER"}>
                              ORG ADMIN
                            </option>
                          </AppSelect>
                        </div>
                      ) : null}
                    </div>

                    {organizationSelected && organization.teams.length > 0 ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Team access</p>
                        {organization.teams.map((team) => {
                          const selectedTeamRole = teamRoles[team.id];
                          const teamSelected = Boolean(selectedTeamRole);

                          return (
                            <div key={team.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5">
                              <label className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={teamSelected}
                                  disabled={organizationAdminLocked}
                                  onChange={(event) => toggleTeam(team.id, event.target.checked)}
                                  className="h-4 w-4 rounded border border-slate-400 accent-green-700"
                                />
                                <span className="truncate">{team.name}</span>
                              </label>
                              {teamSelected ? (
                                <div className="w-[180px]">
                                  <AppSelect
                                    value={selectedTeamRole ?? "MEMBER"}
                                    disabled={organizationAdminLocked}
                                    onChange={(event) =>
                                      setTeamRoles((current) => ({
                                        ...current,
                                        [team.id]: event.target.value as RoleChoice,
                                      }))
                                    }
                                    className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-[9px] font-semibold tracking-wide disabled:bg-slate-100 disabled:text-slate-500"
                                  >
                                    <option value="MEMBER">TEAM MEMBER</option>
                                    <option value="ADMIN">TEAM ADMIN</option>
                                  </AppSelect>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {organizationAdminLocked ? (
                          <p className="text-[11px] font-semibold text-slate-500">
                            ORG ADMIN selected: all teams in this organization are locked to TEAM ADMIN.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })
                : null}
            </section>

            <div className="min-h-[20px]" aria-live="polite">
              {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
              {!error && success ? <p className="text-xs font-semibold text-green-600">{success}</p> : null}
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <Button
              type="button"
              onClick={sendVerification}
              disabled={
                !resolved ||
                selectedOrganizationIds.length === 0 ||
                options.length === 0 ||
                [...selectedTeamAssignments].some((assignment) => {
                  const organization = options.find((entry) =>
                    entry.teams.some((team) => team.id === assignment.teamId),
                  );
                  return !organization || !selectedOrganizationIdSet.has(organization.id);
                })
              }
              loading={submitLoading}
              loadingText="Sending verification..."
              className="inline-flex h-10 w-full items-center justify-center px-4 text-sm"
            >
              Confirm and send verification
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
