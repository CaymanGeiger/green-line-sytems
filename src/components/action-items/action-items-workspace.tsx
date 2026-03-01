"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";
type ActionItemPriority = "P1" | "P2" | "P3";

type ActionItemRecord = {
  id: string;
  postmortemId: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  createdAt: string;
  updatedAt: string;
  ownerUser: { id: string; name: string } | null;
  incident: {
    id: string;
    incidentKey: string;
    title: string;
    teamName: string;
    serviceName: string | null;
  };
};

type WorkspaceProps = {
  initialItems: ActionItemRecord[];
  users: Array<{ id: string; name: string }>;
  postmortems: Array<{
    id: string;
    incidentId: string;
    incidentKey: string;
    incidentTitle: string;
  }>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
};

type CreateFormState = {
  postmortemId: string;
  title: string;
  description: string;
  ownerUserId: string;
  dueDate: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
};

type RowDraft = {
  title: string;
  description: string;
  ownerUserId: string;
  dueDate: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
};

type IconActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
};

function IconActionButton({
  label,
  onClick,
  disabled = false,
  tone = "default",
  children,
}: IconActionButtonProps) {
  return (
    <div className="group/icon relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
          tone === "danger"
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded bg-[#616161] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] transition-all duration-150 group-hover/icon:translate-y-0 group-hover/icon:opacity-100 group-focus-within/icon:translate-y-0 group-focus-within/icon:opacity-100">
        {label}
        <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#616161]" />
      </span>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <circle cx="5" cy="10" r="1.8" />
      <circle cx="10" cy="10" r="1.8" />
      <circle cx="15" cy="10" r="1.8" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className="h-4 w-4">
      <path d="M4 3.5h9.5L16.5 6v10.5H4z" />
      <path d="M7 3.5V8h6V3.5" />
      <path d="M7 16h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
      <path d="m4.5 10 3.2 3.2L15.5 5.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M3.5 6h13" />
      <path d="M7.2 6V4.3h5.6V6" />
      <path d="M6.2 6l.8 10h6l.8-10" />
      <path d="M8.6 8.6v5.6M11.4 8.6v5.6" />
    </svg>
  );
}

function toInputDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function emptyCreateState(postmortemId: string): CreateFormState {
  return {
    postmortemId,
    title: "",
    description: "",
    ownerUserId: "",
    dueDate: "",
    status: "OPEN",
    priority: "P2",
  };
}

function toRowDraft(item: ActionItemRecord): RowDraft {
  return {
    title: item.title,
    description: item.description ?? "",
    ownerUserId: item.ownerUserId ?? "",
    dueDate: toInputDate(item.dueDate),
    status: item.status,
    priority: item.priority,
  };
}

function toIsoDate(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toActionItemRecordFromCreateResponse(
  payload: {
    id: string;
    postmortemId: string;
    title: string;
    description: string | null;
    ownerUserId: string | null;
    dueDate: string | null;
    status: ActionItemStatus;
    priority: ActionItemPriority;
    createdAt: string;
    updatedAt: string;
    ownerUser: { id: string; name: string } | null;
    postmortem: {
      incidentId: string;
      incident: {
        incidentKey: string;
        title: string;
        team: { name: string };
        service: { name: string } | null;
      };
    };
  },
): ActionItemRecord {
  return {
    id: payload.id,
    postmortemId: payload.postmortemId,
    title: payload.title,
    description: payload.description,
    ownerUserId: payload.ownerUserId,
    dueDate: payload.dueDate,
    status: payload.status,
    priority: payload.priority,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    ownerUser: payload.ownerUser,
    incident: {
      id: payload.postmortem.incidentId,
      incidentKey: payload.postmortem.incident.incidentKey,
      title: payload.postmortem.incident.title,
      teamName: payload.postmortem.incident.team.name,
      serviceName: payload.postmortem.incident.service?.name ?? null,
    },
  };
}

export function ActionItemsWorkspace({ initialItems, users, postmortems, permissions }: WorkspaceProps) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() => {
    const record: Record<string, RowDraft> = {};
    initialItems.forEach((item) => {
      record[item.id] = toRowDraft(item);
    });
    return record;
  });
  const [createState, setCreateState] = useState<CreateFormState>(
    emptyCreateState(postmortems[0]?.id ?? ""),
  );
  const [createLoading, setCreateLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createItem() {
    if (!permissions.canCreate) {
      setError("You do not have permission to create action items.");
      return;
    }

    if (!createState.postmortemId || !createState.title.trim()) {
      setError("Postmortem and title are required.");
      return;
    }

    setCreateLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/action-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postmortemId: createState.postmortemId,
          title: createState.title,
          description: createState.description || null,
          ownerUserId: createState.ownerUserId || null,
          dueDate: toIsoDate(createState.dueDate),
          status: createState.status,
          priority: createState.priority,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to create action item");
        return;
      }

      const created = toActionItemRecordFromCreateResponse(body.actionItem);

      setItems((current) => [created, ...current]);
      setDrafts((current) => ({
        ...current,
        [created.id]: toRowDraft(created),
      }));
      setCreateState(emptyCreateState(createState.postmortemId));
      setFeedback("Action item created.");
    } catch {
      setError("Unable to create action item");
    } finally {
      setCreateLoading(false);
    }
  }

  async function saveItem(id: string, overrideDraft?: RowDraft) {
    if (!permissions.canUpdate) {
      setError("You do not have permission to update action items.");
      return;
    }

    const draft = overrideDraft ?? drafts[id];
    if (!draft || !draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSavingIds((current) => ({ ...current, [id]: true }));
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          ownerUserId: draft.ownerUserId || null,
          dueDate: toIsoDate(draft.dueDate),
          status: draft.status,
          priority: draft.priority,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to update action item");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                title: body.actionItem.title,
                description: body.actionItem.description,
                ownerUserId: body.actionItem.ownerUserId,
                dueDate: body.actionItem.dueDate,
                status: body.actionItem.status,
                priority: body.actionItem.priority,
                updatedAt: body.actionItem.updatedAt,
                ownerUser: body.actionItem.ownerUser,
              }
            : item,
        ),
      );

      setFeedback("Action item updated.");
    } catch {
      setError("Unable to update action item");
    } finally {
      setSavingIds((current) => ({ ...current, [id]: false }));
    }
  }

  async function markDone(id: string) {
    const currentDraft = drafts[id];
    if (!currentDraft) {
      return;
    }

    const nextDraft = {
      ...currentDraft,
      status: "DONE" as const,
    };

    setDrafts((current) => ({
      ...current,
      [id]: nextDraft,
    }));
    await saveItem(id, nextDraft);
  }

  async function deleteItem(id: string) {
    if (!permissions.canDelete) {
      setError("You do not have permission to delete action items.");
      return;
    }

    setDeletingIds((current) => ({ ...current, [id]: true }));
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/action-items/${id}`, {
        method: "DELETE",
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Unable to delete action item");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setFeedback("Action item deleted.");
    } catch {
      setError("Unable to delete action item");
    } finally {
      setDeletingIds((current) => ({ ...current, [id]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Create action item</h3>
        {permissions.canCreate ? (
          <>
            <p className="mt-1 text-xs text-slate-600">Add remediation work directly to a postmortem.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <select
                value={createState.postmortemId}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    postmortemId: event.target.value,
                  }))
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select postmortem</option>
                {postmortems.map((postmortem) => (
                  <option key={postmortem.id} value={postmortem.id}>
                    {postmortem.incidentKey} · {postmortem.incidentTitle}
                  </option>
                ))}
              </select>
              <input
                value={createState.title}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Action title"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                value={createState.description}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Description (optional)"
                rows={2}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-3"
              />
              <select
                value={createState.ownerUserId}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    ownerUserId: event.target.value,
                  }))
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">No owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={createState.dueDate}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <select
                value={createState.priority}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    priority: event.target.value as ActionItemPriority,
                  }))
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
              <select
                value={createState.status}
                onChange={(event) =>
                  setCreateState((current) => ({
                    ...current,
                    status: event.target.value as ActionItemStatus,
                  }))
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
              <Button
                type="button"
                onClick={createItem}
                disabled={createLoading || postmortems.length === 0}
                className="inline-flex h-10 w-full items-center justify-center px-4 text-sm leading-none sm:w-auto"
              >
                {createLoading ? "Creating..." : "Create action item"}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-600">You do not have permission to create action items for this team.</p>
        )}
      </section>

      {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No action items match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 pb-2">Incident</th>
                <th className="px-2 pb-2">Task</th>
                <th className="px-2 pb-2">Owner</th>
                <th className="px-2 pb-2">Priority</th>
                <th className="px-2 pb-2">Status</th>
                <th className="px-2 pb-2">Due</th>
                <th className="px-2 pb-2">Updated</th>
                <th className="px-2 pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const draft = drafts[item.id] ?? toRowDraft(item);
                const busy = savingIds[item.id] || deletingIds[item.id];

                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-none align-top">
                    <td className="px-2 py-3">
                      <Link href={`/incidents/${item.incident.id}`} className="font-semibold text-blue-700 hover:text-blue-800">
                        {item.incident.incidentKey}
                      </Link>
                      <p className="text-xs text-slate-500">{item.incident.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.incident.teamName} · {item.incident.serviceName ?? "No service"}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              title: event.target.value,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              description: event.target.value,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        rows={2}
                        placeholder="Description"
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={draft.ownerUserId}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              ownerUserId: event.target.value,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">No owner</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        Current: {item.ownerUser ? item.ownerUser.name : "No owner"}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={draft.priority}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              priority: event.target.value as ActionItemPriority,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              status: event.target.value as ActionItemStatus,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="date"
                        value={draft.dueDate}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              dueDate: event.target.value,
                            },
                          }))
                        }
                        disabled={!permissions.canUpdate}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-600">{formatDateTime(new Date(item.updatedAt))}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="group relative inline-flex items-center justify-end">
                        <div className="invisible absolute right-11 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 opacity-0 shadow-md transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                          <IconActionButton
                            label={savingIds[item.id] ? "Saving..." : "Save changes"}
                            onClick={() => saveItem(item.id)}
                            disabled={busy || !permissions.canUpdate}
                          >
                            <SaveIcon />
                          </IconActionButton>
                          <IconActionButton
                            label={draft.status === "DONE" ? "Already complete" : "Mark as complete"}
                            onClick={() => markDone(item.id)}
                            disabled={busy || draft.status === "DONE" || !permissions.canUpdate}
                          >
                            <CheckIcon />
                          </IconActionButton>
                          <IconActionButton
                            label={deletingIds[item.id] ? "Deleting..." : "Delete action item"}
                            onClick={() => deleteItem(item.id)}
                            disabled={busy || !permissions.canDelete}
                            tone="danger"
                          >
                            <TrashIcon />
                          </IconActionButton>
                        </div>
                        <button
                          type="button"
                          title="More actions"
                          aria-label="More actions"
                          disabled={busy || (!permissions.canUpdate && !permissions.canDelete)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <DotsIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Owners available on this page: {users.length}. Changes save through secured API routes.
      </p>
    </div>
  );
}
