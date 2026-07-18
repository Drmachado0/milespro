import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PiggyBank, Plane, Building2, Car, Ship, ShieldCheck, Landmark, Bus, ArrowRight, TrendingUp } from 'lucide-react';
import { useTotalSavings } from '@/hooks/travel/useTotalSavings';
import { useLocalization } from '@/hooks/useLocalization';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CategoryItem {
  key: string;
  icon: LucideIcon;
  label: string;
  value: number;
}

const CATEGORIES: Omit<CategoryItem, 'value'>[] = [
  { key: 'tickets', icon: Plane, label: 'Passagens' },
  { key: 'hotels', icon: Building2, label: 'Hotéis' },
  { key: 'cars', icon: Car, label: 'Carros' },
  { key: 'cruises', icon: Ship, label: 'Cruzeiros' },
  { key: 'insurances', icon: ShieldCheck, label: 'Seguros' },
  { key: 'attractions', icon: Landmark, label: 'Atrações' },
  { key: 'transfers', icon: Bus, label: 'Transfers' },
];

function SavingsHighlightCardComponent() {
  const { formatCurrency } = useLocalization();
  const navigate = useNavigate();
  const { data, isLoading } = useTotalSavings();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSavings = data?.totalSavings || 0;
  const reservationsCount = data?.reservationsCount || 0;
  const isPositive = totalSavings >= 0;

  // Calculate category items with values
  const categoryItems: CategoryItem[] = CATEGORIES.map(cat => ({
    ...cat,
    value: data?.savingsByCategory?.[cat.key as keyof typeof data.savingsByCategory] || 0,
  }));

  // Calculate percentage contribution of each category
  const totalAbsSavings = categoryItems.reduce((sum, cat) => sum + Math.abs(cat.value), 0);

  return (
    <Card className={cn(
      "border overflow-hidden ring-1",
      isPositive 
        ? "bg-gradient-to-br from-success/8 via-success/4 to-background border-success/20 ring-success/10" 
        : "bg-gradient-to-br from-destructive/8 via-destructive/4 to-background border-destructive/20 ring-destructive/10"
    )}>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              isPositive ? "bg-success/8" : "bg-destructive/8"
            )}>
              <PiggyBank className={cn(
                "h-8 w-8",
                isPositive ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Economizado</p>
              <p className={cn(
                "font-mono text-3xl sm:text-4xl font-bold tabular-nums tracking-tight",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totalSavings)}
              </p>
              <p className="text-sm text-muted-foreground">
                em {reservationsCount} {reservationsCount === 1 ? 'reserva' : 'reservas'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/relatorios/economia')}
            className="gap-2 shrink-0"
          >
            Ver Detalhes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {categoryItems.map((cat, index) => {
            const Icon = cat.icon;
            const isItemPositive = cat.value >= 0;
            const percentage = totalAbsSavings > 0 
              ? ((Math.abs(cat.value) / totalAbsSavings) * 100).toFixed(0)
              : '0';
            
            return (
              <div
                key={cat.key}
                className={cn(
                  "p-3 rounded-xl bg-card/80 backdrop-blur-sm border transition-all hover:scale-[1.02] hover:shadow-md cursor-default animate-fade-in",
                  isItemPositive ? "border-success/20" : "border-destructive/20"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    isItemPositive ? "bg-success/8" : "bg-destructive/8"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      isItemPositive ? "text-success" : "text-destructive"
                    )} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium truncate">{cat.label}</span>
                </div>
                <p className={cn(
                  "text-sm font-bold",
                  isItemPositive ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(cat.value)}
                </p>
                {cat.value !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={cn(
                      "h-3 w-3",
                      isItemPositive ? "text-success" : "text-destructive rotate-180"
                    )} />
                    <span className="text-xs text-muted-foreground">{percentage}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const SavingsHighlightCard = memo(SavingsHighlightCardComponent);
