import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import { TrendingUp, Calendar, Target, Sparkles, RotateCcw, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
import { useClubSubscriptions, Modality, BonusType, BonusFrequency, BONUS_FREQUENCY_CONFIG } from '@/hooks/useClubSubscriptions';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectionData {
  month: string;
  monthLabel: string;
  monthlyPoints: number;
  initialBonus: number;
  recurringBonus: number;
  total: number;
  accumulated: number;
  cost: number;
  accumulatedCost: number;
}

export function SubscriptionProjectionChart() {
  const navigate = useNavigate();
  const { subscriptions, calculateRecurringBonus } = useClubSubscriptions();
  const { formatCurrency, formatNumber } = useLocalization();
  
  const activeSubscriptions = subscriptions.filter(s => s.active);

  const projectionData = useMemo(() => {
    const data: ProjectionData[] = [];
    const today = new Date();
    let accumulated = 0;
    let accumulatedCost = 0;

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthLabel = date.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit'
      });

      let monthlyPoints = 0;
      let initialBonus = 0;
      let recurringBonus = 0;
      let monthCost = 0;

      activeSubscriptions.forEach(sub => {
        // Add monthly points (fixed recurring)
        monthlyPoints += sub.points_per_month || 0;

        // Calculate monthly cost based on modality
        if (sub.modality === 'annual_upfront' && sub.annual_price) {
          monthCost += sub.annual_price / 12;
        } else if (sub.modality === 'annual_installments' && sub.annual_installment_price) {
          monthCost += sub.annual_installment_price;
        } else {
          monthCost += sub.monthly_fee || 0;
        }

        // Initial bonus only applies in the first month
        if (i === 0 && (sub.initial_bonus || 0) > 0) {
          initialBonus += sub.initial_bonus || 0;
        }

        // Recurring bonus based on frequency
        if (sub.bonus_type === 'recurring' && (sub.bonus_value || 0) > 0) {
          const frequency = sub.bonus_frequency as BonusFrequency || 'quarterly';
          const config = BONUS_FREQUENCY_CONFIG[frequency];
          // Credit bonus at the start and then at each interval
          if (i === 0 || i > 0 && i % config.months === 0) {
            recurringBonus += sub.bonus_value || 0;
          }
        }
      });

      const total = monthlyPoints + initialBonus + recurringBonus;
      accumulated += total;
      accumulatedCost += monthCost;

      data.push({
        month: monthKey,
        monthLabel,
        monthlyPoints,
        initialBonus,
        recurringBonus,
        total,
        accumulated,
        cost: monthCost,
        accumulatedCost
      });
    }

    return data;
  }, [activeSubscriptions]);

  const totals = useMemo(() => {
    const lastMonth = projectionData[projectionData.length - 1];
    const firstMonth = projectionData[0];
    const totalInitialBonus = firstMonth?.initialBonus || 0;
    const totalRecurringBonus = projectionData.reduce((sum, d) => sum + d.recurringBonus, 0);
    const totalMonthlyPoints = projectionData.reduce((sum, d) => sum + d.monthlyPoints, 0);
    const totalBonusPoints = totalInitialBonus + totalRecurringBonus;

    return {
      totalPoints: lastMonth?.accumulated || 0,
      totalMonthlyPoints,
      totalInitialBonus,
      totalRecurringBonus,
      totalBonusPoints,
      totalCost: lastMonth?.accumulatedCost || 0,
      avgCostPerThousandBase: totalMonthlyPoints > 0 ? (lastMonth?.accumulatedCost || 0) / totalMonthlyPoints * 1000 : 0,
      avgCostPerThousandWithBonus: (lastMonth?.accumulated || 0) > 0 ? (lastMonth?.accumulatedCost || 0) / (lastMonth?.accumulated || 1) * 1000 : 0
    };
  }, [projectionData]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ProjectionData;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Pontos fixos:</span>
              <span className="font-medium">{formatNumber(data.monthlyPoints)}</span>
            </div>
            {data.initialBonus > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bônus único:</span>
                <span className="font-medium text-success">+{formatNumber(data.initialBonus)}</span>
              </div>
            )}
            {data.recurringBonus > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bônus recorrente:</span>
                <span className="font-medium text-violet-600">+{formatNumber(data.recurringBonus)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t pt-1 mt-1">
              <span className="text-muted-foreground">Acumulado:</span>
              <span className="font-bold text-primary">{formatNumber(data.accumulated)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Custo acum.:</span>
              <span className="font-medium">{formatCurrency(data.accumulatedCost)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (activeSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Projeção 12 Meses
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState
            icon={CreditCard}
            title="Nenhuma assinatura ativa"
            description="Cadastre uma assinatura de clube de milhas para ver a projeção de pontos acumulados nos próximos 12 meses."
            actionLabel="Nova Assinatura"
            onAction={() => navigate('/gestao/clube-assinante')}
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Projeção 12 Meses
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Baseado em {activeSubscriptions.length} assinatura(s) ativa(s)
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Pontos Fixos</p>
            <p className="font-bold text-sm">{formatNumber(totals.totalMonthlyPoints)}</p>
          </div>
          <div className="text-center p-2 bg-success/10 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Sparkles className="text-success w-[15px] h-[14px]" />
              <p className="text-xs text-muted-foreground">Bônus Único</p>
            </div>
            <p className="font-bold text-sm text-success">+{formatNumber(totals.totalInitialBonus)}</p>
          </div>
          <div className="text-center p-2 bg-violet-500/10 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <RotateCcw className="text-violet-600 w-[15px] h-[15px]" />
              <p className="text-xs text-muted-foreground">Bônus Recorrentes</p>
            </div>
            <p className="font-bold text-sm text-violet-600">+{formatNumber(totals.totalRecurringBonus)}</p>
          </div>
          <div className="text-center p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Projetado</p>
            <p className="font-bold text-primary text-sm">{formatNumber(totals.totalPoints)}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="font-bold text-sm">{formatCurrency(totals.totalCost)}</p>
          </div>
        </div>

        {/* Milheiro Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Milheiro Base</p>
            <p className="font-bold text-lg">{formatCurrency(totals.avgCostPerThousandBase)}</p>
            <p className="text-xs text-muted-foreground">sem bônus</p>
          </div>
          <div className="text-center p-2 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground">Milheiro c/ Bônus</p>
            <p className="font-bold text-lg text-primary">{formatCurrency(totals.avgCostPerThousandWithBonus)}</p>
            <p className="text-xs text-muted-foreground">com todos os bônus</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={projectionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
              tickFormatter={v => `${Math.round(v / 1000)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={value => {
                switch (value) {
                  case 'monthlyPoints':
                    return 'Pontos Fixos';
                  case 'initialBonus':
                    return 'Bônus Único';
                  case 'recurringBonus':
                    return 'Bônus Recorrente';
                  default:
                    return value;
                }
              }}
            />
            <Bar dataKey="monthlyPoints" stackId="a" fill="hsl(var(--primary))" name="monthlyPoints" radius={[0, 0, 0, 0]} />
            <Bar dataKey="initialBonus" stackId="a" fill="hsl(142 76% 36%)" name="initialBonus" radius={[0, 0, 0, 0]} />
            <Bar dataKey="recurringBonus" stackId="a" fill="hsl(270 70% 55%)" name="recurringBonus" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Monthly breakdown hint */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Média mensal: {formatNumber(Math.round(totals.totalMonthlyPoints / 12))} pontos fixos</span>
          </div>
          <span>{formatCurrency(totals.totalCost / 12)}/mês</span>
        </div>
      </CardContent>
    </Card>
  );
}
