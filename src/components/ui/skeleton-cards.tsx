import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// KPI Card Skeleton - matches KPICard structure
export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn(
      'overflow-hidden',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-8 w-32 mb-2" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Program Card Skeleton - matches ProgramCard structure
export function ProgramCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn(
      'overflow-hidden hover:shadow-md transition-all duration-300',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Skeleton - for bar/pie charts
export function ChartSkeleton({ 
  className,
  variant = 'bar'
}: { 
  className?: string;
  variant?: 'bar' | 'pie' | 'line';
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        {variant === 'bar' && (
          <div className="flex items-end justify-around h-48 gap-2 pt-4">
            {[65, 85, 45, 70, 55, 90, 60].map((height, i) => (
              <Skeleton 
                key={i} 
                className="w-8 rounded-t-md" 
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}
        {variant === 'pie' && (
          <div className="flex items-center justify-center h-48">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        )}
        {variant === 'line' && (
          <div className="h-48 relative">
            <Skeleton className="absolute bottom-0 left-0 right-0 h-32 rounded-lg opacity-30" />
            <Skeleton className="absolute bottom-8 left-4 right-4 h-1 rounded-full" />
          </div>
        )}
        <div className="flex justify-center gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Alert Card Skeleton - for alerts and notifications
export function AlertCardSkeleton({ 
  className,
  itemCount = 3
}: { 
  className?: string;
  itemCount?: number;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
          >
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Table Row Skeleton - for operation tables
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton 
            className={cn(
              'h-4',
              i === 0 ? 'w-24' : i === columns - 1 ? 'w-16' : 'w-20'
            )} 
          />
        </td>
      ))}
    </tr>
  );
}

// Operations Table Skeleton - full table skeleton
export function OperationsTableSkeleton({ 
  className,
  rowCount = 5
}: { 
  className?: string;
  rowCount?: number;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Data', 'Programa', 'Tipo', 'Qtd', 'Custo', 'Status'].map((_, i) => (
                  <th key={i} className="p-3 text-left">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, i) => (
                <TableRowSkeleton key={i} columns={6} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-3 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions Skeleton
export function QuickActionsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Market Prices Skeleton
export function MarketPricesSkeleton({ 
  className,
  itemCount = 4
}: { 
  className?: string;
  itemCount?: number;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="text-right">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
        <Skeleton className="h-9 w-full rounded-md mt-4" />
      </CardContent>
    </Card>
  );
}

// Expiration Alerts Skeleton
export function ExpirationAlertsSkeleton({ 
  className,
  itemCount = 3
}: { 
  className?: string;
  itemCount?: number;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
          >
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-5 w-16 rounded-full ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Goals Card Skeleton
export function GoalsCardSkeleton({ 
  className,
  itemCount = 2
}: { 
  className?: string;
  itemCount?: number;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Dashboard Full Skeleton - combines all skeletons
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Program Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProgramCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartSkeleton variant="bar" />
          <OperationsTableSkeleton />
        </div>
        <div className="space-y-6">
          <MarketPricesSkeleton />
          <ExpirationAlertsSkeleton />
          <GoalsCardSkeleton />
        </div>
      </div>
    </div>
  );
}
