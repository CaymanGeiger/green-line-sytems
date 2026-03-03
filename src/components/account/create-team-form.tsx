"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/ui/app-select";

import { Button } from "@/components/ui/button";

type OrganizationOption = {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type CreateTeamFormProps = {
  organizations: OrganizationOption[];
  preselectedOrganizationId?: string;
  hideOrganizationSelector?: boolean;
  submitLabel?: string;
};

export function CreateTeamForm({
  organizations,
  preselectedOrganizationId,
  hideOrganizationSelector = false,
  submitLabel = "Create team",
}: CreateTeamFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(
    preselectedOrganizationId ?? (organizations[0] ? organizations[0].id : ""),
  );
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedOrganization =
    organizations.find((organization) => organization.id === organizationId) ?? organizations[0] ?? null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/account/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          organizationId: organizationId || null,
          organizationName: organizationName || null,
        }),
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

      {organizations.length > 0 ? (
        hideOrganizationSelector ? (
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organization
            <input
              value={selectedOrganization?.name ?? ""}
              readOnly
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm text-slate-600"
            />
          </label>
        ) : (
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organization
            <AppSelect
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm"
              required
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({organization.role})
                </option>
              ))}
            </AppSelect>
          </label>
        )
      ) : (
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Organization name
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            minLength={2}
            maxLength={80}
            placeholder="Acme Engineering"
            required
          />
        </label>
      )}

      <div className="min-h-[20px]" aria-live="polite">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        {!error && success ? <p className="text-xs font-semibold text-green-600">{success}</p> : null}
      </div>

      <Button type="submit" loading={loading} loadingText="Creating...">
        {submitLabel}
      </Button>
    </form>
  );
}
