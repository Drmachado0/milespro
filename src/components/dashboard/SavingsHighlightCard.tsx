import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PiggyBank, Plane, Building2, Car, Ship, ShieldCheck, Landmark, Bus, ArrowRight } from 'lucide-react';
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
    <Card className="relative overflow-hidden border-white/[0.07] bg-[hsl(var(--mp-surface-2))] shadow-flat">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative p-5 sm:p-7">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="flex items-start gap-4">
            <div className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl border",
              isPositive ? "bg-success/8" : "bg-destructive/8"
            )}>
              <PiggyBank className={cn(
                "h-5 w-5",
                isPositive ? "text-success" : "text-destructive"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Economia consolidada</p>
              <p className={cn(
                "mt-1 break-words font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-none tabular-nums tracking-[-0.04em]",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totalSavings)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
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

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {categoryItems.map((cat, index) => {
            const Icon = cat.icon;
            const isItemPositive = cat.value >= 0;
            const percentage = totalAbsSavings > 0 
              ? ((Math.abs(cat.value) / totalAbsSavings) * 100).toFixed(0)
              : '0';
            
            return (
              <div
                key={cat.key}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{cat.label}</span>
                  <span className={cn("font-mono text-sm font-semibold tabular-nums", isItemPositive ? "text-success" : "text-destructive")}>{formatCurrency(cat.value)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label={`Participação de ${cat.label}`} aria-valuenow={Number(percentage)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cn("h-full rounded-full", isItemPositive ? "bg-success" : "bg-destructive")} style={{ width: `${Math.max(Number(percentage), cat.value === 0 ? 0 : 2)}%` }} />
                  </div>
                  <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const SavingsHighlightCard = memo(SavingsHighlightCardComponent);
