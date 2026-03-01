import { GridSkeleton, LinesSkeleton } from "@/components/skeletons";

export default function PermissionsLoading() {
  return (
    <div className="space-y-4">
      <LinesSkeleton lines={3} />
      <GridSkeleton cards={2} />
    </div>
  );
}
