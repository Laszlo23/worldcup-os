import { Skeleton } from "@/components/ui/skeleton";

export function MatchLoadingSkeleton() {
  return (
    <section className="space-y-6 px-4 pt-5">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex w-full items-end justify-between">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-12 w-16" />
        </div>
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </section>
  );
}
