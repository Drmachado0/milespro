import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts';
import type { TooltipProps } from 'recharts';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useLocalization } from '@/hooks/useLocalization';
import { useSubscriptionHistory, MonthlyEvolutionData } from '@/hooks/useSubscriptionHistory';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  subscriptionId?: string;
}

export function SubscriptionHistoryChart({ subscriptionId }: Props) {
  const [period, setPeriod] = useState<'6' | '12' | '24'>('12');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const { getMonthlyEvolution, getAccumulatedTotals, isLoading } = useSubscriptionHistory(subscriptionId);
  const { formatCurrency, formatNumber } = useLocalization();

  const data = getMonthlyEvolution(parseInt(period));
  const totals = getAccumulatedTotals();

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.dataKey === 'cost' || entry.dataKey === 'costPerThousand'
                  ? formatCurrency(entry.value ?? 0)
                  : formatNumber(entry.value ?? 0)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Carregando histórico...</div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.total > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Mensal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'line')}>
              <TabsList className="h-8">
                <TabsTrigger value="bar" className="text-xs px-2">
                  <BarChart3 className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="line" className="text-xs px-2">
                  <TrendingUp className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={period} onValueChange={(v) => setPeriod(v as '6' | '12' | '24')}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum histórico registrado ainda. Os dados serão populados automaticamente a cada mês.
          </div>
        ) : (
          <>
            {/* Totals Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Pontos</p>
                <p className="font-bold text-primary">{formatNumber(totals.totalPoints)}</p>
              </div>
              <div className="text-center p-2 bg-success/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Bônus</p>
                <p className="font-bold text-success">{formatNumber(totals.totalBonus)}</p>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Pago</p>
                <p className="font-bold">{formatCurrency(totals.totalPaid)}</p>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={250}>
              {chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconSize={8}
                  />
                  <Bar
                    dataKey="points"
                    name="Pontos"
                    fill="hsl(var(--primary))"
                    stackId="stack"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="bonus"
                    name="Bônus"
                    fill="hsl(var(--mp-success))"
                    stackId="stack"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconSize={8}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    name="Total Pontos"
                    fill="hsl(var(--primary) / 0.2)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="costPerThousand"
                    name="Custo/Milheiro"
                    stroke="hsl(var(--mp-orange-500))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--mp-orange-500))', r: 3 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
