import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProgramDistributionChart } from '@/components/charts/ProgramDistributionChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useConsolidatedSavings } from '@/hooks/useConsolidatedSavings';
import { useLocalization } from '@/hooks/useLocalization';
import { 
  TrendingUp, 
  Loader2, 
  ChevronRight, 
  PiggyBank, 
  Layers, 
  BarChart3,
  Plane,
  Building2,
  Car,
  Ship,
  ShieldCheck,
  Landmark,
  Bus,
  Inbox,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CATEGORY_ICONS = {
  tickets: Plane,
  hotels: Building2,
  cars: Car,
  cruises: Ship,
  insurances: ShieldCheck,
  attractions: Landmark,
  transfers: Bus,
};

const CATEGORY_LABELS = {
  tickets: 'Passagens',
  hotels: 'Hotéis',
  cars: 'Carros',
  cruises: 'Cruzeiros',
  insurances: 'Seguros',
  attractions: 'Atrações',
  transfers: 'Transfers',
};

export default function Analises() {
  const navigate = useNavigate();
  const { formatCurrency, formatNumber } = useLocalization();
  const { balances, totalBalance, isLoading: balancesLoading } = useProgramBalances();
  const { data: savingsData, isLoading: savingsLoading } = useConsolidatedSavings();

  const isLoading = balancesLoading || savingsLoading;

  // Programs with positive balance
  const programsWithBalance = balances.filter((b) => b.balance > 0);

  // Transform balances to chart distribution data
  const programDistributionData = balances.slice(0, 5).map((b, index) => ({
    name: b.program,
    value: b.balance,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Monthly savings chart data. Preserve `monthKey` (YYYY-MM) alongside the
  // human label so we can tell whether the most recent bucket is the current
  // (still-accumulating) month vs the previous closed one.
  const monthlyChartData = savingsData?.monthlyTrend.slice(-6).map((m) => ({
    month: m.monthLabel,
    monthKey: m.month,
    Economia: m.savings,
    Custo: m.totalCost,
  })) || [];

  // "Economia Recente" — pick the most recent fully closed month when the
  // last bucket is the current month (which would show a misleading partial
  // figure). If we only have one month of data, fall through to it anyway.
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const lastBucket = monthlyChartData[monthlyChartData.length - 1];
  const isLastBucketPartial = lastBucket?.monthKey === currentMonthKey;
  const recentSavingsBucket = isLastBucketPartial && monthlyChartData.length >= 2
    ? monthlyChartData[monthlyChartData.length - 2]
    : lastBucket;
  const recentSavingsValue = recentSavingsBucket?.Economia ?? 0;
  const recentSavingsLabel = isLastBucketPartial && monthlyChartData.length < 2
    ? 'mês atual (parcial)'
    : recentSavingsBucket?.month
      ? `mês de ${recentSavingsBucket.month}`
      : 'sem dados';

  // Category savings for stacked bar
  const categorySavingsData = Object.entries(savingsData?.savingsByCategory || {})
    .map(([key, value]) => ({
      category: CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] || key,
      value: Math.max(0, value),
      icon: CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <DashboardLayout title="Visão Analítica">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Visão Analítica">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          icon={<BarChart3 className="h-5 w-5" />}
          title="Visão Analítica"
          subtitle="KPIs, tendências e distribuição do seu portfólio de milhas"
        />
        {/* Hero KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Savings */}
          <Card className="bg-gradient-to-br from-success/10 via-success/5 to-background border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-success" />
                Economia Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                'font-mono text-2xl font-bold tabular-nums tracking-tight',
                (savingsData?.totalSavings || 0) >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {formatCurrency(savingsData?.totalSavings || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono tabular-nums">{savingsData?.reservationsCount || 0}</span> reservas
              </p>
            </CardContent>
          </Card>

          {/* Total Miles */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Milhas Acumuladas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatNumber(totalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                em todos os programas
              </p>
            </CardContent>
          </Card>

          {/* Active Programs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-info" />
                Programas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {programsWithBalance.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                com saldo positivo
              </p>
            </CardContent>
          </Card>

          {/* Savings This Month */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Economia Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                'font-mono text-2xl font-bold tabular-nums tracking-tight',
                recentSavingsValue >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {formatCurrency(recentSavingsValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {recentSavingsLabel}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/relatorios/economia">
              <PiggyBank className="h-4 w-4 mr-2" />
              Relatório de Economia
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/relatorios/passagens">
              <Plane className="h-4 w-4 mr-2" />
              Passagens Emitidas
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/relatorios">
              <BarChart3 className="h-4 w-4 mr-2" />
              Todos os Relatórios
            </Link>
          </Button>
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Savings by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Economia por Categoria</CardTitle>
              <CardDescription>Distribuição da economia gerada</CardDescription>
            </CardHeader>
            <CardContent>
              {categorySavingsData.length > 0 ? (
                <div className="space-y-3">
                  {categorySavingsData.map((item, index) => {
                    const Icon = item.icon;
                    const maxValue = categorySavingsData[0]?.value || 1;
                    const percentage = (item.value / maxValue) * 100;
                    return (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{item.category}</span>
                          </div>
                          <span className="font-mono font-medium tabular-nums text-success">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhuma economia registrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Distribution */}
          <ProgramDistributionChart
            data={programDistributionData}
            activeCount={programsWithBalance.length}
          />
        </section>

        {/* Monthly Evolution */}
        {monthlyChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução Mensal</CardTitle>
              <CardDescription>Economia e custos nos últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Custo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Economia" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Program Performance Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Performance por Programa</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/relatorios">
                Ver todos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <EmptyState
                compact
                icon={Inbox}
                title="Nenhuma operação registrada"
                description="Cadastre sua primeira operação para ver os saldos por programa."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Programa</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saldo</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Custo Médio</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Investido</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Operações</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.slice(0, 10).map((program) => (
                      <tr
                        key={program.program}
                        className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/programa/${encodeURIComponent(program.program)}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <ProgramLogo program={program.program} size="sm" />
                            <span className="font-medium">{program.program}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatNumber(program.balance)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {program.averageCost > 0 ? formatCurrency(program.averageCost) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatCurrency(program.totalInvested)}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono tabular-nums">
                          {program.operationsCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
