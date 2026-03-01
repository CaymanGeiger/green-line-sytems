import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function IncidentDetailLoading() {
  return (
    <div className="space-y-6">
      <Card title="Loading incident" subtitle="Fetching incident context">
        <LinesSkeleton lines={4} />
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Timeline" className="xl:col-span-2">
          <LinesSkeleton lines={9} />
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              title="Loading"
            >
              <LinesSkeleton lines={4} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
