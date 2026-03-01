import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      <Card title="Account">
        <LinesSkeleton lines={3} />
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Profile">
          <LinesSkeleton lines={5} />
        </Card>
        <Card title="Password">
          <LinesSkeleton lines={6} />
        </Card>
      </div>
      <Card title="Team Memberships">
        <LinesSkeleton lines={5} />
      </Card>
    </div>
  );
}
