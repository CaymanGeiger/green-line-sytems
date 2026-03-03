"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/account/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const nextError = body.error ?? "Unable to create organization.";
        setError((current) => (current === nextError ? current : nextError));
        return;
      }

      setName("");
      setError((current) => (current ? null : current));
      setSuccess((current) =>
        current === "Organization created. You can now add teams and members."
          ? current
          : "Organization created. You can now add teams and members.",
      );
      router.refresh();
    } catch {
      const nextError = "Unable to create organization.";
      setError((current) => (current === nextError ? current : nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Organization name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          minLength={2}
          maxLength={80}
          placeholder="BlueRidge Software"
          required
        />
      </label>

      <div className="min-h-[20px]" aria-live="polite">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        {!error && success ? <p className="text-xs font-semibold text-green-600">{success}</p> : null}
      </div>

      <Button
        type="submit"
        className="inline-flex h-10 items-center justify-center px-4 text-sm"
        loading={loading}
        loadingText="Creating..."
      >
        Create organization
      </Button>
    </form>
  );
}
