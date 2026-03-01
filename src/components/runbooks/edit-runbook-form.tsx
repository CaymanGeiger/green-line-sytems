"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type Runbook = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  version: number;
  isActive: boolean;
  tags: string[];
};

export function EditRunbookForm({ runbook }: { runbook: Runbook }) {
  const router = useRouter();
  const [title, setTitle] = useState(runbook.title);
  const [slug, setSlug] = useState(runbook.slug);
  const [markdown, setMarkdown] = useState(runbook.markdown);
  const [version, setVersion] = useState(runbook.version);
  const [tags, setTags] = useState(runbook.tags.join(","));
  const [isActive, setIsActive] = useState(runbook.isActive);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/runbooks/${runbook.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        setError(body.error ?? "Unable to update runbook");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update runbook");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
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
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Markdown
        <textarea
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={18}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Active runbook
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save runbook"}
        </Button>
      </div>
    </form>
  );
}
