import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramSummaryProps {
  program: string;
  balance: number;
  totalInvested: number;
  estimatedValue: number;
  economyFromEmissions: number;
  roi: number;
  averageCost: number;
  marketPrice: number;
}

export function ProgramSummary({
  program,
  balance,
  totalInvested,
  estimatedValue,
  economyFromEmissions,
  roi,
  averageCost,
  marketPrice,
}: ProgramSummaryProps) {
  const { formatCurrency, formatNumber } = useLocalization();

  // Real ROI considering emissions savings
  const realROI = totalInvested > 0 
    ? ((estimatedValue + economyFromEmissions - totalInvested) / totalInvested) * 100 
    : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg">Resumo Final do Programa</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Program Identity */}
          <div className="flex items-center gap-4 md:border-r md:pr-6 border-border">
            <ProgramLogo program={program} size="lg" className="w-16 h-16" />
            <div>
              <h3 className="text-xl font-bold text-foreground">{program}</h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">{formatNumber(balance)}</span> milhas
              </p>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center md:text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total Investido</p>
              <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
                {formatCurrency(totalInvested)}
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Valor Estimado</p>
              <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
                {formatCurrency(estimatedValue)}
              </p>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                @ {formatCurrency(marketPrice)}/mil
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Economia Emissões</p>
              <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-violet-500">
                {formatCurrency(economyFromEmissions)}
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">ROI Potencial</p>
              <div className="flex items-center gap-1 justify-center md:justify-start">
                {roi >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <p className={cn(
                  'font-mono text-lg font-bold tabular-nums tracking-tight',
                  roi >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {roi >= 0 ? '+' : ''}{formatNumber(roi, 1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Real ROI Banner */}
        <div className={cn(
          'mt-6 p-4 rounded-lg',
          realROI >= 0 ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                ROI Real (incluindo economia das emissões)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor estimado + economia em emissões - investimento total
              </p>
            </div>
            <div className="flex items-center gap-2">
              {realROI >= 0 ? (
                <TrendingUp className={cn('h-6 w-6', realROI >= 0 ? 'text-success' : 'text-destructive')} />
              ) : (
                <TrendingDown className="h-6 w-6 text-destructive" />
              )}
              <span className={cn(
                'font-mono text-2xl font-bold tabular-nums tracking-tight',
                realROI >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {realROI >= 0 ? '+' : ''}{formatNumber(realROI, 1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
