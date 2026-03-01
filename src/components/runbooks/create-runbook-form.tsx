"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type TeamOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; teamId: string };

type Props = {
  teams: TeamOption[];
  services: ServiceOption[];
};

export function CreateRunbookForm({ teams, services }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [markdown, setMarkdown] = useState("## Summary\n\nDescribe first-response steps.");
  const [tags, setTags] = useState("incident,response");
  const [version, setVersion] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = useMemo(
    () => services.filter((service) => !teamId || service.teamId === teamId),
    [services, teamId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/runbooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          serviceId: serviceId || null,
          title,
          slug,
          markdown,
          tags: tags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          version,
          isActive,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to create runbook");
        return;
      }

      setTitle("");
      setSlug("");
      setMarkdown("## Summary\n\nDescribe first-response steps.");
      router.refresh();
    } catch {
      setError("Unable to create runbook");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team
        <select
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setServiceId("");
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Service
        <select
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Team-level runbook</option>
          {filteredServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Slug
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
          placeholder="database-failover"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Tags (comma-separated)
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Version
        <input
          type="number"
          min={1}
          value={version}
          onChange={(event) => setVersion(Number.parseInt(event.target.value, 10) || 1)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Markdown
        <textarea
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={10}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Active runbook
      </label>

      {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create runbook"}
        </Button>
      </div>
    </form>
  );
}
