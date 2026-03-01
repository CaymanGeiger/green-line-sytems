import { Card } from "@/components/ui/card";

export default function ActionItemsLoading() {
  return (
    <div className="space-y-6">
      <Card title="Action Items" subtitle="Loading remediation queue filters...">
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </Card>
      <Card title="Remediation Queue" subtitle="Loading action items...">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </Card>
    </div>
  );
}
