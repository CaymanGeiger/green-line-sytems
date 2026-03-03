import { notFound } from "next/navigation";

import { EditRunbookForm } from "@/components/runbooks/edit-runbook-form";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function RunbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const { activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeamId) {
    notFound();
  }

  const runbook = await prisma.runbook.findFirst({
    where: {
      id,
      teamId: activeTeamId,
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!runbook) {
    notFound();
  }

  const [canViewRunbook, canUpdateRunbook] = await Promise.all([
    canUserPerformTeamAction(user.id, runbook.teamId, "RUNBOOK", "VIEW"),
    canUserPerformTeamAction(user.id, runbook.teamId, "RUNBOOK", "UPDATE"),
  ]);

  if (!canViewRunbook) {
    notFound();
  }

  const versionHistory = await prisma.runbook.findMany({
    where: {
      teamId: runbook.teamId,
      slug: runbook.slug,
    },
    orderBy: {
      version: "desc",
    },
    select: {
      id: true,
      version: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <Card
        title={runbook.title}
        subtitle={`Team ${runbook.team.name}${runbook.service ? ` · Service ${runbook.service.name}` : ""}`}
      >
        {canUpdateRunbook ? (
          <EditRunbookForm
            runbook={{
              id: runbook.id,
              title: runbook.title,
              slug: runbook.slug,
              markdown: runbook.markdown,
              version: runbook.version,
              isActive: runbook.isActive,
              tags: Array.isArray(runbook.tagsJson) ? runbook.tagsJson.map((item) => String(item)) : [],
            }}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">You have view-only access to this runbook.</p>
            <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</p>
              <p className="text-sm text-slate-800">{runbook.slug}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Markdown</p>
              <pre className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{runbook.markdown}</pre>
            </article>
          </div>
        )}
      </Card>

      <Card title="Version History" subtitle="All versions for this team and slug.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 pb-2 md:px-4">Version</th>
                <th className="px-3 pb-2 md:px-4">State</th>
                <th className="px-3 pb-2 md:px-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {versionHistory.map((versionRow) => (
                <tr key={versionRow.id} className="border-b border-slate-100 last:border-none">
                  <td className="px-3 py-3 md:px-4">v{versionRow.version}</td>
                  <td className="px-3 py-3 md:px-4">{versionRow.isActive ? "ACTIVE" : "INACTIVE"}</td>
                  <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(versionRow.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
