import { Skeleton } from "@/components/ui/misc";

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
