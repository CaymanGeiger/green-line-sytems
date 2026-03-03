"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  initialName: string;
  email: string;
};

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to update profile");
        return;
      }

      setSuccess("Profile updated.");
    } catch {
      setError("Unable to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Email
        <input
          value={email}
          readOnly
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Display name
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
        {!error && success ? <p className="text-xs font-semibold text-green-600">{success}</p> : null}
      </div>
      <Button type="submit" loading={loading} loadingText="Saving..." className="h-10 px-4 text-sm">
        Save profile
      </Button>
    </form>
  );
}
