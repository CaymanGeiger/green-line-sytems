import { GridSkeleton, LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Card title="Command Dashboard" subtitle="Loading filters...">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </Card>
      <GridSkeleton cards={6} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Active Incidents" className="xl:col-span-2">
          <LinesSkeleton lines={7} />
        </Card>
        <Card title="Recent Deploys">
          <LinesSkeleton lines={6} />
        </Card>
      </div>
      <Card title="Recent Errors">
        <LinesSkeleton lines={5} />
      </Card>
    </div>
  );
}
