import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Coins, Target, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';

interface ProgramKPIsProps {
  balance: number;
  averageCost: number;
  estimatedValue: number;
  roi: number;
}

export function ProgramKPIs({ balance, averageCost, estimatedValue, roi }: ProgramKPIsProps) {
  const { formatCurrency, formatNumber } = useLocalization();

  const kpis = [
    {
      title: 'Saldo Atual',
      value: formatNumber(balance),
      subtitle: 'milhas',
      icon: Coins,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Custo Médio',
      value: formatCurrency(averageCost),
      subtitle: 'por milheiro',
      icon: Target,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Valor Estimado',
      value: formatCurrency(estimatedValue),
      subtitle: 'base mercado',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'ROI Total',
      value: `${roi >= 0 ? '+' : ''}${formatNumber(roi, 1)}%`,
      subtitle: roi >= 0 ? 'lucro' : 'prejuízo',
      icon: roi >= 0 ? TrendingUp : TrendingDown,
      color: roi >= 0 ? 'text-success' : 'text-destructive',
      bgColor: roi >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                <p className={cn('font-mono text-2xl font-bold tabular-nums tracking-tight', kpi.color)}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', kpi.bgColor)}>
                <kpi.icon className={cn('h-5 w-5', kpi.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
