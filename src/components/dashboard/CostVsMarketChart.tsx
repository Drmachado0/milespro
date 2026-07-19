import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, BarChart3, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { ProgramLogo } from '@/components/ui/program-logo';
import { cn } from '@/lib/utils';

export function CostVsMarketChart() {
  const { formatCurrency } = useLocalization();
  const { prices, isLoading: pricesLoading } = useMarketPrices();
  const { balances, isLoading: balancesLoading } = useProgramBalances();

  const chartData = useMemo(() => {
    if (!prices || !balances) return [];

    // Aggregate balances by program and calculate average cost
    const programStats = balances.reduce((acc, balance) => {
      if (!balance.averageCost || balance.averageCost <= 0) return acc;
      
      if (!acc[balance.program]) {
        acc[balance.program] = { totalCost: 0, totalBalance: 0 };
      }
      acc[balance.program].totalCost += (balance.averageCost || 0) * balance.balance;
      acc[balance.program].totalBalance += balance.balance;
      return acc;
    }, {} as Record<string, { totalCost: number; totalBalance: number }>);

    // Combine with market prices
    return Object.entries(programStats)
      .map(([program, stats]) => {
        const avgCost = stats.totalBalance > 0 ? stats.totalCost / stats.totalBalance * 1000 : 0;
        const marketPrice = prices.find(p => p.program === program);
        const marketBuy = marketPrice?.buy_price || 0;
        const marketSell = marketPrice?.sell_price || 0;
        const diff = marketBuy > 0 ? ((avgCost - marketBuy) / marketBuy) * 100 : 0;
        
        return {
          program,
          custo: avgCost,
          mercadoCompra: marketBuy,
          mercadoVenda: marketSell,
          diff,
          isBelowMarket: avgCost < marketBuy,
        };
      })
      .filter(d => d.custo > 0)
      .sort((a, b) => a.diff - b.diff);
  }, [prices, balances]);

  const isLoading = pricesLoading || balancesLoading;

  const chartConfig = {
    custo: { label: 'Seu Custo', color: 'hsl(var(--primary))' },
    mercadoCompra: { label: 'Mercado (Compra)', color: 'hsl(var(--muted-foreground))' },
    mercadoVenda: { label: 'Mercado (Venda)', color: 'hsl(142 76% 36%)' },
  };

  const summary = useMemo(() => {
    const below = chartData.filter(d => d.isBelowMarket).length;
    const above = chartData.length - below;
    const avgDiff = chartData.length > 0 
      ? chartData.reduce((sum, d) => sum + d.diff, 0) / chartData.length 
      : 0;
    return { below, above, avgDiff };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as (typeof chartData)[number];
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
          <ProgramLogo program={data.program} size="sm" />
          <span className="font-semibold">{data.program}</span>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Seu Custo:</span>
            <span className="font-semibold text-primary font-mono tabular-nums tracking-tight">{formatCurrency(data.custo)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Mercado:</span>
            <span className="font-medium font-mono tabular-nums tracking-tight">
              {formatCurrency(data.mercadoCompra)} a {formatCurrency(data.mercadoVenda)}
            </span>
          </div>
          <div className={cn(
            "flex items-center justify-between gap-4 pt-1.5 mt-1.5 border-t border-border/30",
          )}>
            <span className="text-muted-foreground">Diferença:</span>
            <span className={cn(
              "font-bold flex items-center gap-1 font-mono tabular-nums tracking-tight",
              data.diff < 0 ? "text-success" : data.diff > 0 ? "text-warning" : "text-foreground"
            )}>
              {data.diff < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : 
               data.diff > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : 
               <Minus className="h-3.5 w-3.5" />}
              {data.diff > 0 ? '+' : ''}{data.diff.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <span>Custo vs Mercado por Programa</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">Nenhum dado disponível</p>
            <p className="text-xs text-muted-foreground">Registre operações com custo para ver a comparação</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={cn(
                "text-center p-3 rounded-xl border transition-all duration-300 hover:shadow-md",
                summary.below > 0 
                  ? "bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30" 
                  : "bg-muted/30 border-border/50"
              )}>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <div className="p-1 rounded bg-success/20">
                    <TrendingDown className="h-3 w-3 text-success" />
                  </div>
                  Abaixo
                </div>
                <p className="text-2xl font-bold text-success font-mono tabular-nums tracking-tight">{summary.below}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">programas</p>
              </div>
              <div className={cn(
                "text-center p-3 rounded-xl border transition-all duration-300 hover:shadow-md",
                summary.above > 0 
                  ? "bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/30" 
                  : "bg-muted/30 border-border/50"
              )}>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <div className="p-1 rounded bg-warning/20">
                    <TrendingUp className="h-3 w-3 text-warning" />
                  </div>
                  Acima
                </div>
                <p className="text-2xl font-bold text-warning font-mono tabular-nums tracking-tight">{summary.above}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">programas</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-muted/50 via-muted/30 to-transparent border border-border/50 transition-all duration-300 hover:shadow-md">
                <p className="text-xs text-muted-foreground mb-1">Média Geral</p>
                <p className={cn(
                  "text-2xl font-bold flex items-center justify-center gap-1 font-mono tabular-nums tracking-tight",
                  summary.avgDiff < 0 ? "text-success" : summary.avgDiff > 0 ? "text-warning" : "text-foreground"
                )}>
                  {summary.avgDiff < 0 ? <ArrowDownRight className="h-4 w-4" /> : 
                   summary.avgDiff > 0 ? <ArrowUpRight className="h-4 w-4" /> : null}
                  {summary.avgDiff > 0 ? '+' : ''}{summary.avgDiff.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">vs mercado</p>
              </div>
            </div>

            {/* Chart */}
            <div className="animate-fade-in">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      horizontal={true} 
                      vertical={false} 
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => `R$${v}`}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="program" 
                      width={55}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--foreground))"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(value) => (
                        <span className="text-muted-foreground">
                          {chartConfig[value as keyof typeof chartConfig]?.label || value}
                        </span>
                      )}
                    />
                    <Bar dataKey="custo" name="custo" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.isBelowMarket ? 'hsl(142 76% 36%)' : 'hsl(var(--primary))'}
                          className="transition-opacity duration-200 hover:opacity-80"
                        />
                      ))}
                    </Bar>
                    <Bar 
                      dataKey="mercadoCompra" 
                      name="mercadoCompra" 
                      fill="hsl(var(--muted-foreground))" 
                      opacity={0.3}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-sm bg-success" />
                <span>Abaixo do mercado</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Acima do mercado</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
