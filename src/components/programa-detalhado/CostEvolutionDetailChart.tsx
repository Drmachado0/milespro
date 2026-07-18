import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocalization } from '@/hooks/useLocalization';

interface CostEvolutionData {
  date: string;
  cost: number;
  type: string;
}

interface CostEvolutionDetailChartProps {
  data: CostEvolutionData[];
  marketPrice: number;
  averageCost: number;
}

const TYPE_COLORS: Record<string, string> = {
  compra: 'hsl(var(--mp-success))',
  compra_turbinada: 'hsl(var(--mp-info))',
  bumerangue: 'hsl(var(--mp-orange-500))',
  entrada_manual: 'hsl(var(--mp-violet))',
};

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  compra_turbinada: 'Compra Turbinada',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
};

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1a', days: 365 },
  { label: 'Tudo', days: Infinity },
];

export function CostEvolutionDetailChart({
  data,
  marketPrice,
  averageCost,
}: CostEvolutionDetailChartProps) {
  const { formatDate, formatCurrency, getCurrencySymbol } = useLocalization();
  const [period, setPeriod] = useState<number>(90);

  // Filter data by period
  const filteredData = data.filter((item) => {
    if (period === Infinity) return true;
    const itemDate = new Date(item.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);
    return itemDate >= cutoffDate;
  });

  // Add running average
  let runningTotal = 0;
  let runningCount = 0;
  const chartData = filteredData.map((item) => {
    runningTotal += item.cost;
    runningCount += 1;
    return {
      ...item,
      dateFormatted: formatDate(item.date),
      runningAverage: runningTotal / runningCount,
    };
  });

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as (typeof chartData)[number];
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{data.dateFormatted}</p>
        <p className="text-sm text-muted-foreground">
          Tipo: <span className="font-medium">{TYPE_LABELS[data.type] || data.type}</span>
        </p>
        <p className="text-sm text-primary font-bold">
          Custo: {formatCurrency(data.cost)}
        </p>
        <p className="text-sm text-muted-foreground">
          Média acum.: {formatCurrency(data.runningAverage)}
        </p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Evolução do Custo do Milheiro</CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.label}
              variant={period === p.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.days)}
              className="text-xs px-2 h-7"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma operação no período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${getCurrencySymbol()} ${value}`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Market price reference line */}
              <ReferenceLine
                y={marketPrice}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{
                  value: `Mercado: ${formatCurrency(marketPrice)}`,
                  position: 'right',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 11,
                }}
              />
              
              {/* Average cost reference line */}
              <ReferenceLine
                y={averageCost}
                stroke="hsl(var(--primary))"
                strokeDasharray="3 3"
                label={{
                  value: `Média: ${formatCurrency(averageCost)}`,
                  position: 'right',
                  fill: 'hsl(var(--primary))',
                  fontSize: 11,
                }}
              />

              {/* Cost points */}
              <Line
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={((props: { cx?: number; cy?: number; payload?: (typeof chartData)[number] }) => {
                  const { cx, cy, payload } = props;
                  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
                    return <g />;
                  }
                  const color = TYPE_COLORS[payload.type] || 'hsl(var(--primary))';
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }) as never}
              />
              
              {/* Running average line */}
              <Line
                type="monotone"
                dataKey="runningAverage"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
