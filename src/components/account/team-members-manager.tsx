"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccordionCard } from "@/components/ui/accordion-card";

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
};

type TeamPendingInvite = {
  id: string;
  email: string;
  role: "OWNER" | "MEMBER";
  expiresAt: string;
};

type TeamRecord = {
  id: string;
  name: string;
  slug: string;
  currentUserRole: "OWNER" | "MEMBER";
  canManageMembers: boolean;
  members: TeamMember[];
  pendingInvites: TeamPendingInvite[];
};

type TeamMembersManagerProps = {
  currentUserId: string;
  initialTeams: TeamRecord[];
};

type AddMemberState = {
  email: string;
  role: "OWNER" | "MEMBER";
  loading: boolean;
  error: string | null;
  success: string | null;
};

function defaultAddMemberState(): AddMemberState {
  return {
    email: "",
    role: "MEMBER",
    loading: false,
    error: null,
    success: null,
  };
}

export function TeamMembersManager({ currentUserId, initialTeams }: TeamMembersManagerProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [forms, setForms] = useState<Record<string, AddMemberState>>(() =>
    initialTeams.reduce<Record<string, AddMemberState>>((accumulator, team) => {
      accumulator[team.id] = defaultAddMemberState();
      return accumulator;
    }, {}),
  );
  const [removingKey, setRemovingKey] = useState<string | null>(null);

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
    if (!state.email.trim()) {
      patchForm(teamId, { error: "Email is required.", success: null });
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
          email: state.email,
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

      if (body.mode === "membership" && body.membership?.user) {
        setTeams((current) =>
          current.map((team) => {
            if (team.id !== teamId) {
              return team;
            }

            const nextMember: TeamMember = {
              userId: body.membership.user.id,
              name: body.membership.user.name,
              email: body.membership.user.email,
              role: body.membership.role,
            };
            const nextPendingInvites = team.pendingInvites.filter(
              (invite) => invite.email.toLowerCase() !== nextMember.email.toLowerCase(),
            );

            const existingIndex = team.members.findIndex((member) => member.userId === nextMember.userId);
            if (existingIndex === -1) {
              return {
                ...team,
                members: [...team.members, nextMember].sort((a, b) => a.name.localeCompare(b.name)),
                pendingInvites: nextPendingInvites,
              };
            }

            const updatedMembers = [...team.members];
            updatedMembers[existingIndex] = nextMember;
            return {
              ...team,
              members: updatedMembers.sort((a, b) => a.name.localeCompare(b.name)),
              pendingInvites: nextPendingInvites,
            };
          }),
        );
      }

      if (body.mode === "invite" && body.invite?.id) {
        setTeams((current) =>
          current.map((team) => {
            if (team.id !== teamId) {
              return team;
            }

            const nextInvite: TeamPendingInvite = {
              id: body.invite.id,
              email: body.invite.email,
              role: body.invite.role,
              expiresAt: body.invite.expiresAt,
            };

            const deduped = team.pendingInvites.filter(
              (invite) => invite.email.toLowerCase() !== nextInvite.email.toLowerCase(),
            );

            return {
              ...team,
              pendingInvites: [nextInvite, ...deduped],
            };
          }),
        );
      }

      patchForm(teamId, {
        email: "",
        loading: false,
        error: null,
        success: (() => {
          if (body.mode === "invite") {
            return "Invite sent. The user will create their account from the email link.";
          }

          if (body.mode === "membership" && body.notificationSent === false) {
            return "Team member saved. Notification email could not be sent.";
          }

          return "Team member saved and notified.";
        })(),
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
        current.map((team) =>
          team.id === teamId
            ? {
                ...team,
                members: team.members.filter((member) => member.userId !== userId),
              }
            : team,
        ),
      );

      patchForm(teamId, {
        error: null,
        success: "Team member removed.",
      });
    } catch {
      patchForm(teamId, {
        error: "Unable to remove team member.",
        success: null,
      });
    } finally {
      setRemovingKey(null);
    }
  }

  async function removePendingInvite(teamId: string, inviteId: string) {
    setRemovingKey(`${teamId}:invite:${inviteId}`);

    try {
      const response = await fetch(`/api/account/teams/${teamId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteId }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(teamId, {
          error: body.error ?? "Unable to revoke invite.",
          success: null,
        });
        return;
      }

      setTeams((current) =>
        current.map((team) =>
          team.id === teamId
            ? {
                ...team,
                pendingInvites: team.pendingInvites.filter((invite) => invite.id !== inviteId),
              }
            : team,
        ),
      );

      patchForm(teamId, {
        error: null,
        success: "Pending invite removed.",
      });
    } catch {
      patchForm(teamId, {
        error: "Unable to revoke invite.",
        success: null,
      });
    } finally {
      setRemovingKey(null);
    }
  }

  if (teams.length === 0) {
    return <p className="text-sm text-slate-500">No memberships found.</p>;
  }

  return (
    <div className="space-y-4">
      {teams.map((team, index) => {
        const canManage = team.canManageMembers;
        const formState = forms[team.id] ?? defaultAddMemberState();

        return (
          <AccordionCard
            key={team.id}
            title={team.name}
            subtitle={`${team.slug} · Your role: ${team.currentUserRole}`}
            preferenceKey={`account-team-members-${team.id}`}
            defaultOpen={index === 0}
            action={<p className="text-xs text-slate-500">{team.members.length} members</p>}
          >
            {team.pendingInvites.length > 0 ? (
              <div className="mb-4 space-y-2">
                {team.pendingInvites.map((invite) => {
                  const isRemovingInvite = removingKey === `${team.id}:invite:${invite.id}`;
                  return (
                    <article
                      key={`${team.id}-${invite.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                        <p className="text-xs text-slate-600">Invited as {invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {invite.role}
                        </span>
                        <span className="rounded bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                          Unverified
                        </span>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="inline-flex h-8 items-center px-3 text-xs"
                            disabled={isRemovingInvite}
                            onClick={() => removePendingInvite(team.id, invite.id)}
                          >
                            {isRemovingInvite ? "Removing..." : "Remove"}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-2">
              {team.members.map((member) => {
                const isRemoving = removingKey === `${team.id}:${member.userId}`;
                return (
                  <article
                    key={`${team.id}-${member.userId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {member.role}
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Verified
                      </span>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex h-8 items-center px-3 text-xs"
                          disabled={isRemoving}
                          onClick={() => removeMember(team.id, member.userId)}
                        >
                          {isRemoving ? "Removing..." : member.userId === currentUserId ? "Leave" : "Remove"}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            {canManage ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add team member</p>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <input
                    value={formState.email}
                    onChange={(event) =>
                      patchForm(team.id, {
                        email: event.target.value,
                      })
                    }
                    placeholder="user@company.com"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={formState.role}
                    onChange={(event) =>
                      patchForm(team.id, {
                        role: event.target.value as "OWNER" | "MEMBER",
                      })
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                  <Button
                    type="button"
                    className="inline-flex h-10 items-center justify-center px-4 text-sm"
                    disabled={formState.loading}
                    onClick={() => addMember(team.id)}
                  >
                    {formState.loading ? "Saving..." : "Add member"}
                  </Button>
                </div>
                <div className="mt-2 min-h-[20px]" aria-live="polite">
                  {formState.error ? <p className="text-xs font-semibold text-rose-600">{formState.error}</p> : null}
                  {!formState.error && formState.success ? (
                    <p className="text-xs font-semibold text-emerald-600">{formState.success}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">You do not have permission to manage members for this team.</p>
            )}
          </AccordionCard>
        );
      })}
    </div>
  );
}
