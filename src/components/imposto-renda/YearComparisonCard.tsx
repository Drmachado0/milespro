import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalization } from '@/hooks/useLocalization';
import { YearOverYearComparison } from '@/hooks/useIncomeTaxReport';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface YearComparisonCardProps {
  comparison: YearOverYearComparison;
  currentYear: number;
  previousYear: number;
}

export function YearComparisonCard({ comparison, currentYear, previousYear }: YearComparisonCardProps) {
  const { formatCurrency, t } = useLocalization();

  const getTrendIcon = () => {
    switch (comparison.trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-destructive" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-success" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (comparison.trend) {
      case 'up':
        return 'text-destructive';
      case 'down':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const getVariationBadge = () => {
    const absVariation = Math.abs(comparison.variation);
    if (comparison.trend === 'up') {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono tabular-nums">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          +{absVariation.toFixed(1)}%
        </Badge>
      );
    }
    if (comparison.trend === 'down') {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-mono tabular-nums">
          <ArrowDownRight className="h-3 w-3 mr-1" />
          -{absVariation.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted">
        {t('incomeTax.stable')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <CardTitle className="text-lg">{t('incomeTax.yearComparison')}</CardTitle>
          </div>
          {getVariationBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Previous Year */}
          <div className="space-y-1">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground font-mono tabular-nums">{previousYear}</p>
            <div className="space-y-1">
              <p className="text-lg font-semibold font-mono tabular-nums">{formatCurrency(comparison.previousYearTax)}</p>
              <p className="text-xs text-muted-foreground">
                {t('incomeTax.sales')}: <span className="font-mono tabular-nums">{formatCurrency(comparison.previousYearSales)}</span>
              </p>
            </div>
          </div>
          
          {/* Current Year */}
          <div className="space-y-1">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground font-mono tabular-nums">{currentYear}</p>
            <div className="space-y-1">
              <p className={`text-lg font-semibold font-mono tabular-nums ${getTrendColor()}`}>
                {formatCurrency(comparison.currentYearTax)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('incomeTax.sales')}: <span className="font-mono tabular-nums">{formatCurrency(comparison.currentYearSales)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Trend message */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            {comparison.trend === 'up' && t('incomeTax.taxIncreased')}
            {comparison.trend === 'down' && t('incomeTax.taxDecreased')}
            {comparison.trend === 'stable' && t('incomeTax.taxStable')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
