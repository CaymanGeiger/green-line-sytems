"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";

import { Button } from "@/components/ui/button";
import { AccordionCard } from "@/components/ui/accordion-card";

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER" | "ADMIN";
  source: "TEAM" | "ORGANIZATION";
};

type OrganizationMemberOption = {
  userId: string;
  name: string;
  email: string;
  organizationRole: "OWNER" | "ADMIN" | "MEMBER";
};

export type TeamRecord = {
  id: string;
  name: string;
  slug: string;
  organizationName?: string;
  currentUserRole: "OWNER" | "MEMBER" | "ORG_OWNER" | "ORG_ADMIN";
  canManageMembers: boolean;
  members: TeamMember[];
  availableMembers: OrganizationMemberOption[];
};

type TeamMembersManagerProps = {
  currentUserId: string;
  initialTeams: TeamRecord[];
  preferenceKeyPrefix?: string;
  defaultOpenFirst?: boolean;
};

type AddMemberState = {
  userId: string;
  role: "OWNER" | "MEMBER" | "ADMIN";
  loading: boolean;
  error: string | null;
  success: string | null;
};

function defaultAddMemberState(nextUserId = ""): AddMemberState {
  return {
    userId: nextUserId,
    role: "MEMBER",
    loading: false,
    error: null,
    success: null,
  };
}

function roleLabel(member: TeamMember): string {
  if (member.role === "ADMIN") {
    return member.source === "ORGANIZATION" ? "ORG ADMIN" : "TEAM ADMIN";
  }
  return member.role;
}

export function TeamMembersManager({
  currentUserId,
  initialTeams,
  preferenceKeyPrefix = "account-team-members",
  defaultOpenFirst = true,
}: TeamMembersManagerProps) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [forms, setForms] = useState<Record<string, AddMemberState>>(() =>
    initialTeams.reduce<Record<string, AddMemberState>>((accumulator, team) => {
      accumulator[team.id] = defaultAddMemberState(team.availableMembers[0]?.userId ?? "");
      return accumulator;
    }, {}),
  );
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [updatingRoleKey, setUpdatingRoleKey] = useState<string | null>(null);

  useEffect(() => {
    setTeams(initialTeams);
    setForms(
      initialTeams.reduce<Record<string, AddMemberState>>((accumulator, team) => {
        accumulator[team.id] = defaultAddMemberState(team.availableMembers[0]?.userId ?? "");
        return accumulator;
      }, {}),
    );
  }, [initialTeams]);

  function patchForm(teamId: string, patch: Partial<AddMemberState>) {
    setForms((current) => ({
      ...current,
      [teamId]: {
        ...(current[teamId] ?? defaultAddMemberState()),
        ...patch,
      },
    }));
  }

  async function addMember(teamId: string) {
    const state = forms[teamId] ?? defaultAddMemberState();
    if (!state.userId) {
      patchForm(teamId, { error: "Select an organization member first.", success: null });
      return;
    }

    patchForm(teamId, { loading: true, error: null, success: null });

    try {
      const response = await fetch(`/api/account/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: state.userId,
          role: state.role,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(teamId, {
          loading: false,
          error: body.error ?? "Unable to add team member.",
        });
        return;
      }

      const membership = body.membership;
      if (membership?.user) {
        const nextRole = membership.role as TeamMember["role"];
        setTeams((current) =>
          current.map((team) => {
            if (team.id !== teamId) {
              return team;
            }

            const nextMember: TeamMember = {
              userId: membership.user.id,
              name: membership.user.name,
              email: membership.user.email,
              role: nextRole,
              source: "TEAM" as const,
            };

            const existingIndex = team.members.findIndex((member) => member.userId === nextMember.userId);
            const nextAvailable = team.availableMembers.filter((member) => member.userId !== nextMember.userId);

            if (existingIndex === -1) {
              return {
                ...team,
                members: [...team.members, nextMember].sort((a, b) => a.name.localeCompare(b.name)),
                availableMembers: nextAvailable,
              };
            }

            const updatedMembers = [...team.members];
            updatedMembers[existingIndex] = nextMember;
            return {
              ...team,
              members: updatedMembers.sort((a, b) => a.name.localeCompare(b.name)),
              availableMembers: nextAvailable,
            };
          }),
        );

        const nextSelectedUserId = (() => {
          const team = teams.find((entry) => entry.id === teamId);
          if (!team) {
            return "";
          }
          return team.availableMembers.find((member) => member.userId !== state.userId)?.userId ?? "";
        })();

        patchForm(teamId, {
          userId: nextSelectedUserId,
          loading: false,
          error: null,
          success: "Team member added.",
        });
        router.refresh();
        return;
      }

      patchForm(teamId, {
        loading: false,
        error: null,
        success: "Team member updated.",
      });
    } catch {
      patchForm(teamId, {
        loading: false,
        error: "Unable to add team member.",
        success: null,
      });
    }
  }

  async function removeMember(teamId: string, userId: string) {
    setRemovingKey(`${teamId}:${userId}`);

    try {
      const response = await fetch(`/api/account/teams/${teamId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(teamId, {
          error: body.error ?? "Unable to remove team member.",
          success: null,
        });
        return;
      }

      setTeams((current) =>
        current.map((team) => {
          if (team.id !== teamId) {
            return team;
          }

          return {
            ...team,
            members: team.members.filter((member) => member.userId !== userId),
          };
        }),
      );

      patchForm(teamId, {
        error: null,
        success: "Team member removed.",
      });
      router.refresh();
    } catch {
      patchForm(teamId, {
        error: "Unable to remove team member.",
        success: null,
      });
    } finally {
      setRemovingKey(null);
    }
  }

  async function updateMemberRole(teamId: string, userId: string, role: "MEMBER" | "ADMIN") {
    setUpdatingRoleKey(`${teamId}:${userId}`);

    try {
      const response = await fetch(`/api/account/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(teamId, {
          error: body.error ?? "Unable to update team member role.",
          success: null,
        });
        return;
      }

      const membership = body.membership;
      if (!membership?.user) {
        patchForm(teamId, {
          error: "Unable to update team member role.",
          success: null,
        });
        return;
      }
      const nextRole = membership.role as TeamMember["role"];

      setTeams((current) =>
        current.map((team) => {
          if (team.id !== teamId) {
            return team;
          }

          return {
            ...team,
            members: team.members
              .map((member) =>
                member.userId === userId
                  ? {
                      ...member,
                      role: nextRole,
                      source: "TEAM" as const,
                    }
                  : member,
              )
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        }),
      );

      patchForm(teamId, {
        error: null,
        success: "Team member role updated.",
      });
      router.refresh();
    } catch {
      patchForm(teamId, {
        error: "Unable to update team member role.",
        success: null,
      });
    } finally {
      setUpdatingRoleKey(null);
    }
  }

  if (teams.length === 0) {
    return <p className="text-sm text-slate-500">No team memberships found.</p>;
  }

  return (
    <div className="space-y-4">
      {teams.map((team, index) => {
        const canManage = team.canManageMembers;
        const formState = forms[team.id] ?? defaultAddMemberState(team.availableMembers[0]?.userId ?? "");

        return (
          <AccordionCard
            key={team.id}
            title={team.name}
            subtitle={`${team.organizationName ? `${team.organizationName} · ` : ""}${team.slug} · Your role: ${team.currentUserRole}`}
            preferenceKey={`${preferenceKeyPrefix}-${team.id}`}
            defaultOpen={defaultOpenFirst ? index === 0 : false}
            action={<p className="text-xs text-slate-500">{team.members.length} members</p>}
          >
            <div className="space-y-2">
              {team.members.map((member) => {
                const isRemoving = removingKey === `${team.id}:${member.userId}`;
                const isUpdatingRole = updatingRoleKey === `${team.id}:${member.userId}`;
                const canEditRole = canManage && member.source === "TEAM" && member.role !== "OWNER";
                const canRemoveMember = canManage && member.source === "TEAM";
                return (
                  <article
                    key={`${team.id}-${member.userId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                      {member.source === "ORGANIZATION" ? (
                        <p className="text-[11px] font-semibold text-slate-500">Inherited from organization role</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEditRole ? (
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1">
                          <AppSelect
                            value={member.role}
                            fitContent
                            noRightPadding
                            disabled={isUpdatingRole || isRemoving}
                            onChange={(event) =>
                              updateMemberRole(team.id, member.userId, event.target.value as "MEMBER" | "ADMIN")
                            }
                            className="min-w-[64px] cursor-pointer appearance-none border-0 bg-transparent p-0 text-[9px] font-semibold tracking-wide text-slate-600 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMIN">TEAM ADMIN</option>
                          </AppSelect>
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {roleLabel(member)}
                        </span>
                      )}
                      <span className="rounded bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
                        Verified
                      </span>
                      {canRemoveMember ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex h-8 items-center px-3 text-xs"
                          disabled={isUpdatingRole}
                          loading={isRemoving}
                          loadingText="Removing..."
                          onClick={() => removeMember(team.id, member.userId)}
                        >
                          {member.userId === currentUserId ? "Leave" : "Remove"}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            {canManage ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Add from organization members
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <AppSelect
                    value={formState.userId}
                    onChange={(event) =>
                      patchForm(team.id, {
                        userId: event.target.value,
                      })
                    }
                    className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    {team.availableMembers.length === 0 ? (
                      <option value="">No available org members</option>
                    ) : (
                      team.availableMembers.map((member) => (
                        <option key={`${team.id}:${member.userId}`} value={member.userId}>
                          {member.name} ({member.email})
                        </option>
                      ))
                    )}
                  </AppSelect>
                  <AppSelect
                    value={formState.role}
                    onChange={(event) =>
                      patchForm(team.id, {
                        role: event.target.value as "OWNER" | "MEMBER" | "ADMIN",
                      })
                    }
                    className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-semibold tracking-wide"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">TEAM ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </AppSelect>
                  <Button
                    type="button"
                    className="inline-flex h-10 items-center justify-center px-4 text-sm"
                    disabled={team.availableMembers.length === 0 || !formState.userId}
                    loading={formState.loading}
                    loadingText="Saving..."
                    onClick={() => addMember(team.id)}
                  >
                    Add member
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Invite people from the Organization section above, then assign them to this team.
                </p>
                <div className="mt-2 min-h-[20px]" aria-live="polite">
                  {formState.error ? <p className="text-xs font-semibold text-rose-600">{formState.error}</p> : null}
                  {!formState.error && formState.success ? (
                    <p className="text-xs font-semibold text-green-600">{formState.success}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                You do not have permission to manage members for this team.
              </p>
            )}
          </AccordionCard>
        );
      })}
    </div>
  );
}
