interface SkeletonProps {
  className?: string;
}

/** Basisblok voor laadstaten — vervangt de "return null"-witteflits die de meeste pagina's nu tonen tijdens hydratie. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: "#f3f0eb" }} />;
}

/**
 * Generieke paginaskelet: titel + subtitel, een rij statistiekkaarten en een
 * groter contentblok. Geen pixel-perfecte kopie per pagina — één herkenbare
 * vorm die overal hetzelfde "aan het laden" gevoel geeft i.p.v. een lege flits.
 */
export function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-56" />
    </div>
  );
}
