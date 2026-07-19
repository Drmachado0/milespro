import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Banknote, Plane, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';

interface SpecialIndicatorsProps {
  iqc: number;
  salePotential: number;
  economyFromEmissions: number;
  expiringMiles: number;
  expiryDate: string | null;
}

export function SpecialIndicators({ iqc, salePotential, economyFromEmissions, expiringMiles, expiryDate }: SpecialIndicatorsProps) {
  const { formatCurrency, formatNumber } = useLocalization();

  const getIQCStatus = (iqc: number) => {
    if (iqc <= 70) return { label: 'Excelente', color: 'text-success', bg: 'bg-success/10' };
    if (iqc <= 90) return { label: 'Bom', color: 'text-info', bg: 'bg-info/10' };
    if (iqc <= 100) return { label: 'Regular', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const iqcStatus = getIQCStatus(iqc);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iqcStatus.bg)}>
              <Gauge className={cn('h-4 w-4', iqcStatus.color)} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">IQC (Índice de Qualidade)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', iqcStatus.color)}>{iqc.toFixed(0)}%</span>
            <span className={cn('text-sm font-medium', iqcStatus.color)}>{iqcStatus.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Custo vs. Preço de Mercado</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', salePotential >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
              <Banknote className={cn('h-4 w-4', salePotential >= 0 ? 'text-success' : 'text-destructive')} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Potencial de Venda</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className={cn('text-2xl font-bold', salePotential >= 0 ? 'text-success' : 'text-destructive')}>
            {salePotential >= 0 ? '+' : ''}{formatCurrency(salePotential)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{salePotential >= 0 ? 'Lucro se vender tudo' : 'Prejuízo se vender tudo'}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-violet-500/10">
              <Plane className="h-4 w-4 text-violet-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Economia em Emissões</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-primary">{formatCurrency(economyFromEmissions)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total economizado</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', expiringMiles > 0 ? 'bg-warning/10' : 'bg-muted')}>
              <AlertTriangle className={cn('h-4 w-4', expiringMiles > 0 ? 'text-warning' : 'text-muted-foreground')} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Milhas Vencendo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className={cn('text-2xl font-bold', expiringMiles > 0 ? 'text-warning' : 'text-muted-foreground')}>
            {expiringMiles > 0 ? formatNumber(expiringMiles) : '-'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{expiryDate || 'Sem vencimento próximo'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
