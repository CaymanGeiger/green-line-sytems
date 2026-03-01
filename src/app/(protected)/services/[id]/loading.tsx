import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function ServiceDetailLoading() {
  return (
    <div className="space-y-6">
      <Card title="Service" subtitle="Loading service details...">
        <LinesSkeleton lines={4} />
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Recent Incidents" className="xl:col-span-2">
          <LinesSkeleton lines={8} />
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
