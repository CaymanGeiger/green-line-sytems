"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type EditableActionItem = {
  id?: string;
  title: string;
  description: string;
  ownerUserId: string;
  dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "P1" | "P2" | "P3";
};

export type PostmortemInitialState = {
  whatHappened: string;
  impact: string;
  rootCause: string;
  detectionGaps: string;
  actionItemsSummary: string;
  followUpBy: string;
  actionItems: EditableActionItem[];
};

type UsePostmortemEditorArgs = {
  incidentId: string;
  initial: PostmortemInitialState;
  readOnly: boolean;
};

export function emptyActionItem(): EditableActionItem {
  return {
    title: "",
    description: "",
    ownerUserId: "",
    dueDate: "",
    status: "OPEN",
    priority: "P2",
  };
}

export function usePostmortemEditor({ incidentId, initial, readOnly }: UsePostmortemEditorArgs) {
  const router = useRouter();
  const [fields, setFields] = useState(() => ({
    whatHappened: initial.whatHappened,
    impact: initial.impact,
    rootCause: initial.rootCause,
    detectionGaps: initial.detectionGaps,
    actionItemsSummary: initial.actionItemsSummary,
    followUpBy: initial.followUpBy,
  }));
  const [actionItems, setActionItems] = useState<EditableActionItem[]>(
    initial.actionItems.length > 0 ? initial.actionItems : [emptyActionItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof typeof fields>(field: K, value: (typeof fields)[K]) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function updateActionItem(index: number, patch: Partial<EditableActionItem>) {
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
          whatHappened: fields.whatHappened,
          impact: fields.impact,
          rootCause: fields.rootCause,
          detectionGaps: fields.detectionGaps,
          actionItemsSummary: fields.actionItemsSummary,
          followUpBy: fields.followUpBy ? new Date(`${fields.followUpBy}T00:00:00.000Z`).toISOString() : null,
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

  return {
    fields,
    setField,
    actionItems,
    updateActionItem,
    removeActionItem,
    addActionItem,
    onSubmit,
    loading,
    error,
  };
}
