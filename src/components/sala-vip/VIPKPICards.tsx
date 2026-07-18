import { Card, CardContent } from '@/components/ui/card';
import { Crown, CalendarDays, AlertTriangle, Infinity as InfinityIcon, User, Users } from 'lucide-react';
import { useVIPEntriesThisYear } from '@/hooks/useVIPEntries';
import { useCriticalCardsCount, useUnlimitedCardsCount, useVIPCounters } from '@/hooks/useVIPCounters';
import { Skeleton } from '@/components/ui/skeleton';

export function VIPKPICards() {
  const { data: entriesThisYear, isLoading: loadingYear } = useVIPEntriesThisYear();
  const { data: counters, isLoading: loadingCounters } = useVIPCounters();
  const criticalCards = useCriticalCardsCount();
  const unlimitedCards = useUnlimitedCardsCount();

  // Calculate total entries by type
  const totalTitular = counters?.reduce((sum, c) => sum + c.titularUsed, 0) || 0;
  const totalConvidado = counters?.reduce((sum, c) => sum + c.convidadoUsed, 0) || 0;

  const kpis = [
    {
      title: 'Entradas Este Ano',
      value: entriesThisYear,
      icon: CalendarDays,
      color: 'text-info',
      bgColor: 'bg-info/10',
      loading: loadingYear,
    },
    {
      title: 'Entradas Titular',
      value: totalTitular,
      icon: User,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      loading: loadingCounters,
    },
    {
      title: 'Entradas Convidado',
      value: totalConvidado,
      icon: Users,
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary/50',
      loading: loadingCounters,
    },
    {
      title: 'Cartões em Alerta',
      value: criticalCards,
      icon: AlertTriangle,
      color: criticalCards > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: criticalCards > 0 ? 'bg-destructive/10' : 'bg-muted/50',
      loading: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`h-11 w-11 grid place-items-center rounded-2xl ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{kpi.title}</p>
                {kpi.loading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
