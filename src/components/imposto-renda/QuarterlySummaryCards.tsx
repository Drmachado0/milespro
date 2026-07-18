import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalization } from '@/hooks/useLocalization';
import { QuarterlySummary } from '@/hooks/useIncomeTaxReport';
import { Calendar } from 'lucide-react';

interface QuarterlySummaryCardsProps {
  data: QuarterlySummary[];
}

export function QuarterlySummaryCards({ data }: QuarterlySummaryCardsProps) {
  const { formatCurrency, t } = useLocalization();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('incomeTax.quarterlySummary')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.map((quarter) => (
            <div
              key={quarter.quarter}
              className="p-4 rounded-lg border bg-muted/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg font-mono tabular-nums">{quarter.quarter}</span>
                <span className="text-xs text-muted-foreground">{quarter.label}</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('incomeTax.sales')}:</span>
                  <span className="font-medium font-mono tabular-nums">{formatCurrency(quarter.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('incomeTax.profit')}:</span>
                  <span className={`font-medium font-mono tabular-nums ${quarter.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(quarter.profit)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">{t('incomeTax.tax')}:</span>
                  <span className={`font-semibold font-mono tabular-nums ${quarter.taxDue > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(quarter.taxDue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
