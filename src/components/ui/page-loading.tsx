import { Skeleton } from "@/components/ui/skeleton";

/**
 * Optimized page loading skeleton using CSS media queries instead of JS hooks.
 * This eliminates matchMedia calls during render for faster FCP.
 */
export function PageLoading() {
  return (
    <div 
      className="min-h-screen bg-background p-4 lg:p-6"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
    >
      {/* Mobile layout - uses CSS to hide on md+ */}
      <div className="md:hidden">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        
        {/* Mobile KPI cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl border border-border bg-card">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        
        {/* Content cards */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card">
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop layout - uses CSS to hide on mobile */}
      <div className="hidden md:block">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="p-6 rounded-lg border border-border bg-card">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
