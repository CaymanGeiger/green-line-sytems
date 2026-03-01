"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type ActionItem = {
  id?: string;
  title: string;
  description: string;
  ownerUserId: string;
  dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "P1" | "P2" | "P3";
};

type PostmortemEditorProps = {
  incidentId: string;
  readOnly?: boolean;
  initial: {
    whatHappened: string;
    impact: string;
    rootCause: string;
    detectionGaps: string;
    actionItemsSummary: string;
    followUpBy: string;
    actionItems: ActionItem[];
  };
  users: { id: string; name: string }[];
};

function emptyActionItem(): ActionItem {
  return {
    title: "",
    description: "",
    ownerUserId: "",
    dueDate: "",
    status: "OPEN",
    priority: "P2",
  };
}

export function PostmortemEditor({ incidentId, readOnly = false, initial, users }: PostmortemEditorProps) {
  const router = useRouter();
  const [whatHappened, setWhatHappened] = useState(initial.whatHappened);
  const [impact, setImpact] = useState(initial.impact);
  const [rootCause, setRootCause] = useState(initial.rootCause);
  const [detectionGaps, setDetectionGaps] = useState(initial.detectionGaps);
  const [actionItemsSummary, setActionItemsSummary] = useState(initial.actionItemsSummary);
  const [followUpBy, setFollowUpBy] = useState(initial.followUpBy);
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    initial.actionItems.length > 0 ? initial.actionItems : [emptyActionItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateActionItem(index: number, patch: Partial<ActionItem>) {
    setActionItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeActionItem(index: number) {
    setActionItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addActionItem() {
    setActionItems((current) => [...current, emptyActionItem()]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/postmortems/${incidentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatHappened,
          impact,
          rootCause,
          detectionGaps,
          actionItemsSummary,
          followUpBy: followUpBy ? new Date(`${followUpBy}T00:00:00.000Z`).toISOString() : null,
          actionItems: actionItems
            .filter((item) => item.title.trim().length > 0)
            .map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description || null,
              ownerUserId: item.ownerUserId || null,
              dueDate: item.dueDate ? new Date(`${item.dueDate}T00:00:00.000Z`).toISOString() : null,
              status: item.status,
              priority: item.priority,
            })),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to save postmortem");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to save postmortem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {readOnly ? (
        <p className="text-sm text-slate-500">You have view-only access to this postmortem.</p>
      ) : null}
      <fieldset className="space-y-4" disabled={readOnly}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          What happened
          <textarea
            value={whatHappened}
            onChange={(event) => setWhatHappened(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Impact
          <textarea
            value={impact}
            onChange={(event) => setImpact(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Root cause
          <textarea
            value={rootCause}
            onChange={(event) => setRootCause(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Detection gaps
          <textarea
            value={detectionGaps}
            onChange={(event) => setDetectionGaps(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Action items summary
          <textarea
            value={actionItemsSummary}
            onChange={(event) => setActionItemsSummary(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Follow up by
          <input
            type="date"
            value={followUpBy}
            onChange={(event) => setFollowUpBy(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Action Items</h3>
            <Button type="button" variant="secondary" onClick={addActionItem}>
              Add item
            </Button>
          </div>

        {actionItems.map((item, index) => (
          <div key={`${item.id ?? "new"}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={item.title}
                onChange={(event) => updateActionItem(index, { title: event.target.value })}
                placeholder="Action title"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <select
                value={item.ownerUserId}
                onChange={(event) => updateActionItem(index, { ownerUserId: event.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">No owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <select
                value={item.priority}
                onChange={(event) => updateActionItem(index, { priority: event.target.value as ActionItem["priority"] })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
              <select
                value={item.status}
                onChange={(event) => updateActionItem(index, { status: event.target.value as ActionItem["status"] })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
              <input
                type="date"
                value={item.dueDate}
                onChange={(event) => updateActionItem(index, { dueDate: event.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeActionItem(index)}
                className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
            <textarea
              value={item.description}
              onChange={(event) => updateActionItem(index, { description: event.target.value })}
              rows={2}
              placeholder="Description"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        ))}
        </section>
      </fieldset>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save postmortem"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
