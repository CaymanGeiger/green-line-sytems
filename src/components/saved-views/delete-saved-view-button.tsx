"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

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
    <Button
      type="button"
      onClick={onDelete}
      disabled={disabled}
      loading={loading}
      loadingText="Deleting..."
      variant="danger"
      className="px-2.5 py-1.5"
      title={disabled ? "You do not have delete permission" : "Delete saved view"}
    >
      Delete
    </Button>
  );
}
