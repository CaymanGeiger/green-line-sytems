"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

type RouteLoadingProps = {
  label?: string;
};

export function RouteLoading({ label = "Loading" }: RouteLoadingProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size={34} className="text-green-700" ariaLabel={label} />
    </div>
  );
}
