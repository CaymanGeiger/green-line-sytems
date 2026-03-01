"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/account/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const nextError = body.error ?? "Unable to create team";
        setError((current) => (current === nextError ? current : nextError));
        return;
      }

      setName("");
      setError((current) => (current ? null : current));
      setSuccess((current) => (current === "Team created." ? current : "Team created."));
      router.refresh();
    } catch {
      const nextError = "Unable to create team";
      setError((current) => (current === nextError ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          minLength={2}
          maxLength={80}
          required
        />
      </label>

      <div className="min-h-[20px]" aria-live="polite">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        {!error && success ? <p className="text-xs font-semibold text-emerald-600">{success}</p> : null}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create team"}
      </Button>
    </form>
  );
}
