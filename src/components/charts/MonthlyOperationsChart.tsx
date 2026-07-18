import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocalization } from '@/hooks/useLocalization';

interface MonthlyOperationsChartProps {
  data: Array<{ month: string; compras: number; vendas: number; transferencias: number }>;
}

function MonthlyOperationsChartComponent({ data }: MonthlyOperationsChartProps) {
  const { formatNumber } = useLocalization();
  
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value ?? 0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Operações Mensais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => <span className="text-sm text-foreground capitalize">{value}</span>}
              />
              <Bar dataKey="compras" name="Compras" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="transferencias" name="Transferências" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize to prevent re-renders when data hasn't changed
export const MonthlyOperationsChart = memo(MonthlyOperationsChartComponent, (prevProps, nextProps) => {
  if (prevProps.data.length !== nextProps.data.length) return false;
  return prevProps.data.every((item, index) => {
    const nextItem = nextProps.data[index];
    return (
      item.month === nextItem.month &&
      item.compras === nextItem.compras &&
      item.vendas === nextItem.vendas &&
      item.transferencias === nextItem.transferencias
    );
  });
});
