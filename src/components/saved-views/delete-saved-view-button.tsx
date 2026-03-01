"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteSavedViewButton({ id, disabled = false }: { id: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (disabled) {
      return;
    }

    setLoading(true);

    try {
      await fetch(`/api/saved-views?id=${id}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading || disabled}
      className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
      title={disabled ? "You do not have delete permission" : "Delete saved view"}
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
