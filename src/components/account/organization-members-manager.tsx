"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";

import { CreateTeamForm } from "@/components/account/create-team-form";
import { TeamMembersManager, type TeamRecord } from "@/components/account/team-members-manager";
import { Button } from "@/components/ui/button";
import { AccordionCard } from "@/components/ui/accordion-card";

type OrganizationMember = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type OrganizationInvite = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  expiresAt: string;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  canManage: boolean;
  canEditName: boolean;
  members: OrganizationMember[];
  pendingInvites: OrganizationInvite[];
};

type OrganizationMembersManagerProps = {
  currentUserId: string;
  initialOrganizations: OrganizationRecord[];
  initialTeamsByOrganizationId: Record<string, TeamRecord[]>;
  focusOrganizationId?: string;
};

type AddState = {
  email: string;
  role: "MEMBER" | "ADMIN";
  loading: boolean;
  error: string | null;
  success: string | null;
};

function defaultAddState(): AddState {
  return {
    email: "",
    role: "MEMBER",
    loading: false,
    error: null,
    success: null,
  };
}

function organizationRoleLabel(role: "OWNER" | "ADMIN" | "MEMBER"): string {
  if (role === "ADMIN") {
    return "ORG ADMIN";
  }
  if (role === "OWNER") {
    return "ORG OWNER";
  }
  return "MEMBER";
}

export function OrganizationMembersManager({
  currentUserId,
  initialOrganizations,
  initialTeamsByOrganizationId,
  focusOrganizationId,
}: OrganizationMembersManagerProps) {
  const router = useRouter();
  const consumedFocusRef = useRef(false);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [nameEdits, setNameEdits] = useState<Record<string, string>>(
    initialOrganizations.reduce<Record<string, string>>((accumulator, organization) => {
      accumulator[organization.id] = organization.name;
      return accumulator;
    }, {}),
  );
  const [forms, setForms] = useState<Record<string, AddState>>(
    initialOrganizations.reduce<Record<string, AddState>>((accumulator, organization) => {
      accumulator[organization.id] = defaultAddState();
      return accumulator;
    }, {}),
  );
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [updatingRoleKey, setUpdatingRoleKey] = useState<string | null>(null);

  useEffect(() => {
    setOrganizations(initialOrganizations);
    setNameEdits(
      initialOrganizations.reduce<Record<string, string>>((accumulator, organization) => {
        accumulator[organization.id] = organization.name;
        return accumulator;
      }, {}),
    );
    setForms(
      initialOrganizations.reduce<Record<string, AddState>>((accumulator, organization) => {
        accumulator[organization.id] = defaultAddState();
        return accumulator;
      }, {}),
    );
  }, [initialOrganizations]);

  useEffect(() => {
    if (!focusOrganizationId) {
      consumedFocusRef.current = false;
      return;
    }

    if (consumedFocusRef.current) {
      return;
    }

    const targetId = `organization-add-member-${focusOrganizationId}`;
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) {
        return false;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = target.querySelector("input");
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
      consumedFocusRef.current = true;
      router.replace("/organizations", { scroll: false });
      return true;
    };

    if (scrollToTarget()) {
      return;
    }

    const timeoutId = window.setTimeout(scrollToTarget, 80);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusOrganizationId, organizations.length, router]);

  function patchForm(organizationId: string, patch: Partial<AddState>) {
    setForms((current) => ({
      ...current,
      [organizationId]: {
        ...(current[organizationId] ?? defaultAddState()),
        ...patch,
      },
    }));
  }

  async function saveOrganizationName(organizationId: string) {
    const nextName = (nameEdits[organizationId] ?? "").trim();
    if (nextName.length < 2) {
      patchForm(organizationId, {
        error: "Organization name must be at least 2 characters.",
      });
      return;
    }

    setRenamingId(organizationId);
    patchForm(organizationId, { error: null, success: null });

    try {
      const response = await fetch(`/api/account/organizations/${organizationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(organizationId, {
          error: body.error ?? "Unable to rename organization.",
        });
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                name: body.organization?.name ?? nextName,
              }
            : organization,
        ),
      );

      patchForm(organizationId, {
        success: "Organization name updated.",
        error: null,
      });
      router.refresh();
    } catch {
      patchForm(organizationId, {
        error: "Unable to rename organization.",
      });
    } finally {
      setRenamingId(null);
    }
  }

  async function addOrganizationMember(organizationId: string) {
    const state = forms[organizationId] ?? defaultAddState();
    if (!state.email.trim()) {
      patchForm(organizationId, {
        error: "Email is required.",
        success: null,
      });
      return;
    }

    patchForm(organizationId, {
      loading: true,
      error: null,
      success: null,
    });

    try {
      const response = await fetch(`/api/account/organizations/${organizationId}/members`, {
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
        patchForm(organizationId, {
          loading: false,
          error: body.error ?? "Unable to add organization member.",
        });
        return;
      }

      if (body.mode === "membership" && body.membership?.user) {
        setOrganizations((current) =>
          current.map((organization) => {
            if (organization.id !== organizationId) {
              return organization;
            }

            const nextMember: OrganizationMember = {
              userId: body.membership.user.id,
              name: body.membership.user.name,
              email: body.membership.user.email,
              role: body.membership.role,
            };
            const nextInvites = organization.pendingInvites.filter(
              (invite) => invite.email.toLowerCase() !== nextMember.email.toLowerCase(),
            );
            const existingIndex = organization.members.findIndex((member) => member.userId === nextMember.userId);
            if (existingIndex === -1) {
              return {
                ...organization,
                members: [...organization.members, nextMember].sort((a, b) => a.name.localeCompare(b.name)),
                pendingInvites: nextInvites,
              };
            }
            const updatedMembers = [...organization.members];
            updatedMembers[existingIndex] = nextMember;
            return {
              ...organization,
              members: updatedMembers.sort((a, b) => a.name.localeCompare(b.name)),
              pendingInvites: nextInvites,
            };
          }),
        );
      }

      if (body.mode === "invite" && body.invite?.id) {
        setOrganizations((current) =>
          current.map((organization) => {
            if (organization.id !== organizationId) {
              return organization;
            }

            const nextInvite: OrganizationInvite = {
              id: body.invite.id,
              email: body.invite.email,
              role: body.invite.role,
              expiresAt: body.invite.expiresAt,
            };
            const deduped = organization.pendingInvites.filter(
              (invite) => invite.email.toLowerCase() !== nextInvite.email.toLowerCase(),
            );
            return {
              ...organization,
              pendingInvites: [nextInvite, ...deduped],
            };
          }),
        );
      }

      patchForm(organizationId, {
        email: "",
        loading: false,
        error: null,
        success: body.mode === "invite" ? "Organization invite sent." : "Organization member added.",
      });
      router.refresh();
    } catch {
      patchForm(organizationId, {
        loading: false,
        error: "Unable to add organization member.",
        success: null,
      });
    }
  }

  async function removeOrganizationMember(organizationId: string, userId: string) {
    setRemovingKey(`${organizationId}:${userId}`);

    try {
      const response = await fetch(`/api/account/organizations/${organizationId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(organizationId, {
          error: body.error ?? "Unable to remove organization member.",
        });
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                members: organization.members.filter((member) => member.userId !== userId),
              }
            : organization,
        ),
      );
      patchForm(organizationId, {
        error: null,
        success: "Organization member removed.",
      });
      router.refresh();
    } catch {
      patchForm(organizationId, {
        error: "Unable to remove organization member.",
      });
    } finally {
      setRemovingKey(null);
    }
  }

  async function updateOrganizationMemberRole(
    organizationId: string,
    member: OrganizationMember,
    role: "MEMBER" | "ADMIN",
  ) {
    if (member.role === "OWNER" || member.role === role) {
      return;
    }

    const targetKey = `${organizationId}:${member.userId}:role`;
    setUpdatingRoleKey(targetKey);
    patchForm(organizationId, {
      error: null,
      success: null,
    });

    try {
      const response = await fetch(`/api/account/organizations/${organizationId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: member.email,
          role,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(organizationId, {
          error: body.error ?? "Unable to update organization member role.",
          success: null,
        });
        return;
      }

      const nextRole = body.membership?.role;
      if (!nextRole) {
        patchForm(organizationId, {
          error: "Unable to update organization member role.",
          success: null,
        });
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                members: organization.members
                  .map((existingMember) =>
                    existingMember.userId === member.userId
                      ? {
                          ...existingMember,
                          role: nextRole,
                        }
                      : existingMember,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name)),
              }
            : organization,
        ),
      );

      patchForm(organizationId, {
        error: null,
        success: "Organization member role updated.",
      });
      router.refresh();
    } catch {
      patchForm(organizationId, {
        error: "Unable to update organization member role.",
        success: null,
      });
    } finally {
      setUpdatingRoleKey(null);
    }
  }

  async function removeOrganizationInvite(organizationId: string, inviteId: string) {
    setRemovingKey(`${organizationId}:invite:${inviteId}`);

    try {
      const response = await fetch(`/api/account/organizations/${organizationId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        patchForm(organizationId, {
          error: body.error ?? "Unable to revoke organization invite.",
        });
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                pendingInvites: organization.pendingInvites.filter((invite) => invite.id !== inviteId),
              }
            : organization,
        ),
      );
      patchForm(organizationId, {
        error: null,
        success: "Organization invite removed.",
      });
      router.refresh();
    } catch {
      patchForm(organizationId, {
        error: "Unable to revoke organization invite.",
      });
    } finally {
      setRemovingKey(null);
    }
  }

  if (organizations.length === 0) {
    return <p className="text-sm text-slate-500">No organizations found.</p>;
  }

  return (
    <div className="space-y-4">
      {organizations.map((organization, index) => {
        const formState = forms[organization.id] ?? defaultAddState();
        const canManage = organization.canManage;
        const canGrantAdmin = organization.currentUserRole === "OWNER";
        const teamsForOrganization = initialTeamsByOrganizationId[organization.id] ?? [];
        const isFocusedOrganization = focusOrganizationId === organization.id;

        return (
          <AccordionCard
            key={organization.id}
            title={organization.name}
            subtitle={`${organization.slug} · Your role: ${organization.currentUserRole}`}
            preferenceKey={`organizations-org-${organization.id}`}
            defaultOpen={index === 0}
            forceOpen={isFocusedOrganization}
            action={<p className="text-xs text-slate-500">{organization.members.length} members</p>}
          >
            <div className="space-y-4">
              {organization.canEditName ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Organization settings
                  </p>
                  <div className="mt-2 flex flex-col gap-2 md:flex-row">
                    <input
                      value={nameEdits[organization.id] ?? ""}
                      onChange={(event) =>
                        setNameEdits((current) => ({
                          ...current,
                          [organization.id]: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                    <Button
                      type="button"
                      className="inline-flex h-10 items-center justify-center px-4 text-sm"
                      loading={renamingId === organization.id}
                      loadingText="Saving..."
                      onClick={() => saveOrganizationName(organization.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : null}

              {organization.pendingInvites.length > 0 ? (
                <div className="space-y-2">
                  {organization.pendingInvites.map((invite) => {
                    const isRemoving = removingKey === `${organization.id}:invite:${invite.id}`;
                    return (
                      <article
                        key={`${organization.id}:invite:${invite.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                          <p className="text-xs text-slate-500">Pending organization invite</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {organizationRoleLabel(invite.role)}
                          </span>
                          <span className="rounded bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Unverified
                          </span>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="inline-flex h-8 items-center px-3 text-xs"
                              loading={isRemoving}
                              loadingText="Removing..."
                              onClick={() => removeOrganizationInvite(organization.id, invite.id)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-2">
                {organization.members.map((member) => {
                  const isRemoving = removingKey === `${organization.id}:${member.userId}`;
                  const isUpdatingRole = updatingRoleKey === `${organization.id}:${member.userId}:role`;
                  const canEditRole = canManage && member.role !== "OWNER";
                  const disableRoleSelect = isRemoving || isUpdatingRole || (!canGrantAdmin && member.role === "ADMIN");
                  return (
                    <article
                      key={`${organization.id}:${member.userId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditRole ? (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1">
                            <AppSelect
                              value={member.role}
                              fitContent
                              noRightPadding
                              disabled={disableRoleSelect}
                              onChange={(event) =>
                                updateOrganizationMemberRole(
                                  organization.id,
                                  member,
                                  event.target.value as "MEMBER" | "ADMIN",
                                )
                              }
                              className="min-w-[64px] cursor-pointer appearance-none border-0 bg-transparent p-0 text-[9px] font-semibold tracking-wide text-slate-600 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500"
                            >
                              <option value="MEMBER">MEMBER</option>
                              {canGrantAdmin || member.role === "ADMIN" ? <option value="ADMIN">ORG ADMIN</option> : null}
                            </AppSelect>
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {organizationRoleLabel(member.role)}
                          </span>
                        )}
                        <span className="rounded bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
                          Verified
                        </span>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="inline-flex h-8 items-center px-3 text-xs"
                            disabled={isUpdatingRole}
                            loading={isRemoving}
                            loadingText="Removing..."
                            onClick={() => removeOrganizationMember(organization.id, member.userId)}
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
                <div
                  id={isFocusedOrganization ? `organization-add-member-${organization.id}` : undefined}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invite organization member
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto]">
                    <input
                      value={formState.email}
                      onChange={(event) =>
                        patchForm(organization.id, {
                          email: event.target.value,
                        })
                      }
                      placeholder="user@company.com"
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                    <AppSelect
                      value={formState.role}
                      onChange={(event) =>
                        patchForm(organization.id, {
                          role: event.target.value as "MEMBER" | "ADMIN",
                        })
                      }
                      className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-semibold tracking-wide"
                    >
                      <option value="MEMBER">MEMBER</option>
                      {canGrantAdmin ? <option value="ADMIN">ORG ADMIN</option> : null}
                    </AppSelect>
                    <Button
                      type="button"
                      className="inline-flex h-10 items-center justify-center px-4 text-sm"
                      loading={formState.loading}
                      loadingText="Sending..."
                      onClick={() => addOrganizationMember(organization.id)}
                    >
                      Add member
                    </Button>
                  </div>
                </div>
              ) : null}

              <AccordionCard
                title="Create Team"
                subtitle="Create a new team inside this organization."
                preferenceKey={`organizations-create-team-${organization.id}`}
              >
                {canManage ? (
                  <CreateTeamForm
                    organizations={[
                      {
                        id: organization.id,
                        name: organization.name,
                        role: organization.currentUserRole,
                      },
                    ]}
                    preselectedOrganizationId={organization.id}
                    hideOrganizationSelector
                    submitLabel="Create team"
                  />
                ) : (
                  <p className="text-sm text-slate-500">You do not have permission to create teams in this organization.</p>
                )}
              </AccordionCard>

              <AccordionCard
                title="Teams"
                subtitle="Team list and team-level membership assignments for this organization."
                preferenceKey={`organizations-teams-list-${organization.id}`}
              >
                {teamsForOrganization.length === 0 ? (
                  <p className="text-sm text-slate-500">No teams in this organization yet.</p>
                ) : (
                  <TeamMembersManager
                    currentUserId={currentUserId}
                    initialTeams={teamsForOrganization}
                    preferenceKeyPrefix={`organizations-team-members-${organization.id}`}
                    defaultOpenFirst={false}
                  />
                )}
              </AccordionCard>

              <div className="min-h-[20px]" aria-live="polite">
                {formState.error ? <p className="text-xs font-semibold text-rose-600">{formState.error}</p> : null}
                {!formState.error && formState.success ? (
                  <p className="text-xs font-semibold text-green-600">{formState.success}</p>
                ) : null}
              </div>
            </div>
          </AccordionCard>
        );
      })}
    </div>
  );
}
