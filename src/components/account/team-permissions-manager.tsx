"use client";

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
  role: "OWNER" | "MEMBER";
};

type PermissionOverride = {
  userId: string;
  resource: PermissionResourceKey;
  action: PermissionActionKey;
  allowed: boolean;
};

type TeamPermissionsManagerProps = {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  overrides: PermissionOverride[];
};

type PermissionMatrix = Record<string, Record<string, boolean>>;

function keyFor(resource: PermissionResourceKey, action: PermissionActionKey): string {
  return `${resource}:${action}`;
}

function buildMemberMatrix(member: TeamMember, overrides: PermissionOverride[]): Record<string, boolean> {
  const base: Record<string, boolean> = {};

  PERMISSION_RESOURCE_DEFINITIONS.forEach((definition) => {
    PERMISSION_ACTIONS.forEach((action) => {
      const key = keyFor(definition.resource, action);
      base[key] = defaultPermissionByMembershipRole(member.role, definition.resource, action);
    });
  });

  overrides.forEach((override) => {
    base[keyFor(override.resource, override.action)] = override.allowed;
  });

  return base;
}

export function TeamPermissionsManager({ teamId, teamName, members, overrides }: TeamPermissionsManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState(() => {
    const firstMember = members.find((member) => member.role !== "OWNER") ?? members[0];
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

  function onToggle(resource: PermissionResourceKey, action: PermissionActionKey, checked: boolean) {
    if (!selectedMember || selectedMember.role === "OWNER") {
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
    if (!selectedMember || selectedMember.role === "OWNER") {
      return;
    }

    setMatrixByUserId((current) => ({
      ...current,
      [selectedMember.userId]: buildMemberMatrix(selectedMember, []),
    }));
    setSuccess(null);
    setError(null);
  }

  async function saveSelectedMember() {
    if (!selectedMember || !selectedMatrix || selectedMember.role === "OWNER") {
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
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Active team: <span className="font-semibold text-slate-900">{teamName}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="space-y-2">
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
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selected
                    ? "border-blue-300 bg-blue-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-500">{member.email}</p>
                <span
                  className={`mt-2 inline-flex rounded px-2 py-1 text-[11px] font-semibold ${
                    member.role === "OWNER"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {member.role}
                </span>
              </button>
            );
          })}
        </section>

        <section className="space-y-3">
          {selectedMember ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Permissions for {selectedMember.name}</p>
                <p className="text-xs text-slate-500">Configure view/create/update/delete access by feature.</p>
              </div>

              {selectedMember.role === "OWNER" ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Owners always keep full permissions for safety and team administration.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-2">Feature</th>
                          {PERMISSION_ACTIONS.map((action) => (
                            <th key={action} className="px-3 py-2 text-center">
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_RESOURCE_DEFINITIONS.map((definition) => (
                          <tr key={definition.resource} className="border-b border-slate-100 last:border-none">
                            <td className="px-3 py-3">
                              <p className="font-semibold text-slate-900">{definition.label}</p>
                              <p className="text-xs text-slate-500">{definition.description}</p>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => {
                              const key = keyFor(definition.resource, action);
                              const checked = selectedMatrix?.[key] ?? false;

                              return (
                                <td key={key} className="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => onToggle(definition.resource, action, event.target.checked)}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
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
                      disabled={loading}
                    >
                      Reset to defaults
                    </Button>
                    <Button
                      type="button"
                      className="inline-flex h-10 items-center justify-center px-4 text-sm"
                      onClick={saveSelectedMember}
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save permissions"}
                    </Button>
                  </div>
                </>
              )}

              <div className="min-h-[20px]" aria-live="polite">
                {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
                {!error && success ? <p className="text-xs font-semibold text-emerald-600">{success}</p> : null}
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
