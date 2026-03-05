"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { defaultPermissionByMembershipRole } from "@/lib/auth/permission-defaults";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCE_DEFINITIONS,
  type PermissionActionKey,
  type PermissionResourceKey,
} from "@/lib/auth/permission-metadata";

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER" | "TEAM_ADMIN" | "ORG_ADMIN" | "ORG_OWNER";
  roleSource: "TEAM" | "ORGANIZATION";
};

type PermissionOverride = {
  userId: string;
  resource: PermissionResourceKey;
  action: PermissionActionKey;
  allowed: boolean;
};

type TeamPermissionsManagerProps = {
  teamId: string;
  members: TeamMember[];
  overrides: PermissionOverride[];
  canUpdate?: boolean;
  addTeamMemberHref?: string;
};

type PermissionMatrix = Record<string, Record<string, boolean>>;

function keyFor(resource: PermissionResourceKey, action: PermissionActionKey): string {
  return `${resource}:${action}`;
}

function buildMemberMatrix(member: TeamMember, overrides: PermissionOverride[]): Record<string, boolean> {
  if (member.role === "OWNER" || member.role === "ORG_OWNER" || member.role === "ORG_ADMIN") {
    return buildFullAccessMatrix();
  }

  const base: Record<string, boolean> = {};

  PERMISSION_RESOURCE_DEFINITIONS.forEach((definition) => {
    PERMISSION_ACTIONS.forEach((action) => {
      const key = keyFor(definition.resource, action);
      base[key] = defaultPermissionByMembershipRole("MEMBER", definition.resource, action);
    });
  });

  overrides.forEach((override) => {
    base[keyFor(override.resource, override.action)] = override.allowed;
  });

  return base;
}

function buildFullAccessMatrix(): Record<string, boolean> {
  const fullAccess: Record<string, boolean> = {};

  PERMISSION_RESOURCE_DEFINITIONS.forEach((definition) => {
    PERMISSION_ACTIONS.forEach((action) => {
      fullAccess[keyFor(definition.resource, action)] = true;
    });
  });

  return fullAccess;
}

export function TeamPermissionsManager({
  teamId,
  members,
  overrides,
  canUpdate = true,
  addTeamMemberHref,
}: TeamPermissionsManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState(() => {
    const firstMember =
      members.find((member) => member.role === "MEMBER") ??
      members.find((member) => member.role !== "OWNER" && member.role !== "ORG_OWNER" && member.role !== "ORG_ADMIN") ??
      members[0];
    return firstMember?.userId ?? "";
  });
  const [matrixByUserId, setMatrixByUserId] = useState<PermissionMatrix>(() => {
    const next: PermissionMatrix = {};
    members.forEach((member) => {
      const memberOverrides = overrides.filter((override) => override.userId === member.userId);
      next[member.userId] = buildMemberMatrix(member, memberOverrides);
    });
    return next;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.userId === selectedUserId) ?? null,
    [members, selectedUserId],
  );

  const selectedMatrix = selectedUserId ? matrixByUserId[selectedUserId] : undefined;
  const selectedMemberHasInheritedFullAccess = Boolean(
    selectedMember &&
      (selectedMember.role === "OWNER" || selectedMember.role === "ORG_OWNER" || selectedMember.role === "ORG_ADMIN"),
  );
  const hasFullAccess = Boolean(
    selectedMember &&
      (selectedMemberHasInheritedFullAccess ||
        (selectedMatrix &&
          PERMISSION_RESOURCE_DEFINITIONS.every((definition) =>
            PERMISSION_ACTIONS.every((action) => selectedMatrix[keyFor(definition.resource, action)] === true),
          ))),
  );

  function onToggle(resource: PermissionResourceKey, action: PermissionActionKey, checked: boolean) {
    if (!selectedMember || selectedMemberHasInheritedFullAccess || !canUpdate) {
      return;
    }

    const key = keyFor(resource, action);
    setMatrixByUserId((current) => ({
      ...current,
      [selectedMember.userId]: {
        ...(current[selectedMember.userId] ?? {}),
        [key]: checked,
      },
    }));
  }

  function resetToDefaults() {
    if (!selectedMember || selectedMemberHasInheritedFullAccess || !canUpdate) {
      return;
    }

    setMatrixByUserId((current) => ({
      ...current,
      [selectedMember.userId]: buildMemberMatrix(selectedMember, []),
    }));
    setSuccess(null);
    setError(null);
  }

  function setFullAccess(enabled: boolean) {
    if (!selectedMember || selectedMemberHasInheritedFullAccess || !canUpdate) {
      return;
    }

    setMatrixByUserId((current) => ({
      ...current,
      [selectedMember.userId]: enabled ? buildFullAccessMatrix() : buildMemberMatrix(selectedMember, []),
    }));
    setSuccess(null);
    setError(null);
  }

  async function saveSelectedMember() {
    if (!selectedMember || !selectedMatrix || selectedMemberHasInheritedFullAccess || !canUpdate) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = PERMISSION_RESOURCE_DEFINITIONS.flatMap((definition) =>
        PERMISSION_ACTIONS.map((action) => ({
          userId: selectedMember.userId,
          resource: definition.resource,
          action,
          allowed: selectedMatrix[keyFor(definition.resource, action)] ?? false,
        })),
      );

      const response = await fetch(`/api/account/teams/${teamId}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to save permissions");
        return;
      }

      setSuccess(`Saved ${selectedMember.name}'s permissions.`);
    } catch {
      setError("Unable to save permissions");
    } finally {
      setLoading(false);
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-slate-500">No team members found.</p>;
  }

  return (
    <div className="space-y-4">
      {!canUpdate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can view permissions for this team, but you do not have access to update them.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team members</p>
          {members.map((member) => {
            const selected = member.userId === selectedUserId;
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => {
                  setSelectedUserId(member.userId);
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full min-w-0 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/30 ${
                  selected
                    ? "border-green-500/50 bg-white shadow-[inset_0_0_0_1px_rgba(22,163,74,0.14)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <p className="break-words text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="break-all text-xs text-slate-500">{member.email}</p>
                <span
                  className={`mt-2 inline-flex rounded px-2 py-1 text-[11px] font-semibold ${
                    member.role === "TEAM_ADMIN"
                      ? "bg-blue-100 text-blue-700"
                      : member.role === "OWNER" || member.role === "ORG_OWNER" || member.role === "ORG_ADMIN"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {member.role === "ORG_ADMIN"
                    ? "ORG ADMIN"
                    : member.role === "ORG_OWNER"
                      ? "ORG OWNER"
                      : member.role === "TEAM_ADMIN"
                        ? "TEAM ADMIN"
                      : member.role}
                </span>
                {member.roleSource === "ORGANIZATION" ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Inherited from organization role</p>
                ) : null}
              </button>
            );
          })}
          {addTeamMemberHref ? (
            <Link
              href={addTeamMemberHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              Add A Team Member
            </Link>
          ) : null}
        </section>

        <section className="min-w-0 space-y-3 lg:pt-6">
          {selectedMember ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Permissions for {selectedMember.name}</p>
                <p className="text-xs text-slate-500">Configure view/create/update/delete access by feature.</p>
              </div>

              {selectedMember.role === "OWNER" ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                  Owners always keep full permissions for safety and team administration.
                </div>
              ) : (
                <>
                  {selectedMemberHasInheritedFullAccess ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                      {selectedMember.role === "ORG_OWNER"
                        ? "Organization owners automatically have full access across all teams."
                        : "Organization admins automatically have full access across all teams."}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Full access</p>
                      <p className="text-xs text-slate-500">Grant create/update/delete access across all features.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={hasFullAccess}
                        onChange={(event) => setFullAccess(event.target.checked)}
                        disabled={!canUpdate || selectedMemberHasInheritedFullAccess}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      Full access
                    </label>
                  </div>

                  <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[640px] text-left text-sm md:min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-2 md:px-4">Feature</th>
                          {PERMISSION_ACTIONS.map((action) => (
                            <th key={action} className="px-3 py-2 text-center md:px-4">
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_RESOURCE_DEFINITIONS.map((definition) => (
                          <tr key={definition.resource} className="border-b border-slate-100 last:border-none">
                            <td className="px-3 py-3 md:px-4">
                              <p className="font-semibold text-slate-900">{definition.label}</p>
                              <p className="text-xs text-slate-500">{definition.description}</p>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => {
                              const key = keyFor(definition.resource, action);
                              const checked = selectedMatrix?.[key] ?? false;

                              return (
                                <td key={key} className="px-3 py-3 text-center md:px-4">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => onToggle(definition.resource, action, event.target.checked)}
                                    disabled={!canUpdate || selectedMemberHasInheritedFullAccess}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex h-10 items-center justify-center px-4 text-sm"
                      onClick={resetToDefaults}
                      disabled={!canUpdate || selectedMemberHasInheritedFullAccess}
                      loading={loading}
                      loadingText="Saving..."
                    >
                      Reset to defaults
                    </Button>
                    <Button
                      type="button"
                      className="inline-flex h-10 items-center justify-center px-4 text-sm"
                      onClick={saveSelectedMember}
                      disabled={!canUpdate || selectedMemberHasInheritedFullAccess}
                      loading={loading}
                      loadingText="Saving..."
                    >
                      Save permissions
                    </Button>
                  </div>
                </>
              )}

              <div className="min-h-[20px]" aria-live="polite">
                {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
                {!error && success ? <p className="text-xs font-semibold text-green-600">{success}</p> : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a team member to configure permissions.</p>
          )}
        </section>
      </div>
    </div>
  );
}
