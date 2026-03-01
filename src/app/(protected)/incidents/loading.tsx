import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function IncidentsLoading() {
  return (
    <div className="space-y-6">
      <Card title="Incidents" subtitle="Loading filters...">
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      </Card>
      <Card title="Create Incident">
        <LinesSkeleton lines={6} />
      </Card>
      <Card title="Incident List">
        <LinesSkeleton lines={9} />
      </Card>
    </div>
  );
}
