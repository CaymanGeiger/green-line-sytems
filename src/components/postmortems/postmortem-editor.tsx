"use client";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { usePostmortemEditor, type EditableActionItem, type PostmortemInitialState } from "@/hooks/use-postmortem-editor";

type PostmortemEditorProps = {
  incidentId: string;
  readOnly?: boolean;
  initial: PostmortemInitialState;
  users: { id: string; name: string }[];
};

export function PostmortemEditor({ incidentId, readOnly = false, initial, users }: PostmortemEditorProps) {
  const {
    fields,
    setField,
    actionItems,
    updateActionItem,
    removeActionItem,
    addActionItem,
    onSubmit,
    error,
    loading,
  } = usePostmortemEditor({ incidentId, initial, readOnly });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {readOnly ? (
        <p className="text-sm text-slate-500">You have view-only access to this postmortem.</p>
      ) : null}
      <fieldset className="space-y-4" disabled={readOnly}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          What happened
          <textarea
            value={fields.whatHappened}
            onChange={(event) => setField("whatHappened", event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Impact
          <textarea
            value={fields.impact}
            onChange={(event) => setField("impact", event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Root cause
          <textarea
            value={fields.rootCause}
            onChange={(event) => setField("rootCause", event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Detection gaps
          <textarea
            value={fields.detectionGaps}
            onChange={(event) => setField("detectionGaps", event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Action items summary
          <textarea
            value={fields.actionItemsSummary}
            onChange={(event) => setField("actionItemsSummary", event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Follow up by
          <input
            type="date"
            value={fields.followUpBy}
            onChange={(event) => setField("followUpBy", event.target.value)}
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
            <ActionItemEditorCard
              key={`${item.id ?? "new"}-${index}`}
              item={item}
              users={users}
              onUpdate={(patch) => updateActionItem(index, patch)}
              onRemove={() => removeActionItem(index)}
            />
          ))}
        </section>
      </fieldset>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="submit" loading={loading} loadingText="Saving...">
            Save postmortem
          </Button>
        </div>
      ) : null}
    </form>
  );
}

type ActionItemEditorCardProps = {
  item: EditableActionItem;
  users: { id: string; name: string }[];
  onUpdate: (patch: Partial<EditableActionItem>) => void;
  onRemove: () => void;
};

function ActionItemEditorCard({ item, users, onUpdate, onRemove }: ActionItemEditorCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={item.title}
          onChange={(event) => onUpdate({ title: event.target.value })}
          placeholder="Action title"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <AppSelect
          value={item.ownerUserId}
          onChange={(event) => onUpdate({ ownerUserId: event.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">No owner</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </AppSelect>
        <AppSelect
          value={item.priority}
          onChange={(event) => onUpdate({ priority: event.target.value as EditableActionItem["priority"] })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </AppSelect>
        <AppSelect
          value={item.status}
          onChange={(event) => onUpdate({ status: event.target.value as EditableActionItem["status"] })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="DONE">DONE</option>
        </AppSelect>
        <input
          type="date"
          value={item.dueDate}
          onChange={(event) => onUpdate({ dueDate: event.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
        >
          Remove
        </button>
      </div>
      <textarea
        value={item.description}
        onChange={(event) => onUpdate({ description: event.target.value })}
        rows={2}
        placeholder="Description"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </div>
  );
}
