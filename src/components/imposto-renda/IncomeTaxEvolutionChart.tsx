import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useLocalization } from '@/hooks/useLocalization';
import { TaxMonthData } from '@/hooks/useIncomeTaxReport';
import { TrendingUp } from 'lucide-react';

interface IncomeTaxEvolutionChartProps {
  data: TaxMonthData[];
  exemptionLimit: number;
}

export function IncomeTaxEvolutionChart({ data, exemptionLimit }: IncomeTaxEvolutionChartProps) {
  const { formatCurrency, t } = useLocalization();

  const chartData = useMemo(() => {
    return data.map((month) => ({
      name: month.monthLabel,
      vendas: month.totalSales,
      imposto: month.taxDue,
      isExempt: month.isExempt,
      percentOfLimit: month.percentOfLimit,
    }));
  }, [data]);

  const chartConfig = {
    vendas: {
      label: t('incomeTax.sales'),
      color: 'hsl(var(--primary))',
    },
    imposto: {
      label: t('incomeTax.taxDue'),
      color: 'hsl(var(--destructive))',
    },
  };

  const getBarColor = (isExempt: boolean, percentOfLimit: number) => {
    if (!isExempt) return 'hsl(var(--destructive))';
    if (percentOfLimit >= 80) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  // Check if there's any tax due to show the tax bars
  const hasTaxDue = data.some((m) => m.taxDue > 0);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('incomeTax.salesEvolution')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      formatCurrency(Number(value)), 
                      name === 'vendas' ? t('incomeTax.sales') : t('incomeTax.taxDue')
                    ]}
                  />
                }
              />
              <ReferenceLine
                y={exemptionLimit}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `${t('incomeTax.exemptionLimit')}: ${formatCurrency(exemptionLimit)}`,
                  position: 'insideTopRight',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 11,
                }}
              />
              <Bar 
                dataKey="vendas" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-sales-${index}`} 
                    fill={getBarColor(entry.isExempt, entry.percentOfLimit)} 
                  />
                ))}
              </Bar>
              {hasTaxDue && (
                <Bar 
                  dataKey="imposto" 
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  opacity={0.8}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-muted-foreground">{t('incomeTax.exempt')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-muted-foreground">{t('incomeTax.nearLimit')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">{t('incomeTax.taxable')}</span>
          </div>
          {hasTaxDue && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive/80" />
              <span className="text-muted-foreground">{t('incomeTax.taxDue')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
