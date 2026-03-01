import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function SavedViewsLoading() {
  return (
    <div className="space-y-6">
      <Card title="Saved Views">
        <LinesSkeleton lines={5} />
      </Card>
      <Card title="My Views">
        <LinesSkeleton lines={8} />
      </Card>
    </div>
  );
}
