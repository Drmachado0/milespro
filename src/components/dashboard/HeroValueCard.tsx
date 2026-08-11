import { memo, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useOperations } from '@/hooks/useOperations';
import { useExpirationAlerts } from '@/hooks/useExpirationAlerts';
import { useLocalization } from '@/hooks/useLocalization';
import { Database } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, ResponsiveContainer as TooltipResponsive } from 'recharts';
import { cn } from '@/lib/utils';

type OperationRow = Database['public']['Tables']['operations']['Row'];
type OperationType = Database['public']['Enums']['operation_type'];

const ADDING: OperationType[] = ['compra', 'compra_turbinada', 'entrada_manual', 'bumerangue'];
const SUBTRACTING: OperationType[] = ['venda', 'resgate'];

/**
 * Builds a day-by-day running balance series over the last `days` days.
 * Each point is total miles held at end-of-day (across all programs).
 */
function buildBalanceSeries(operations: OperationRow[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - days);

  // Per-day net delta
  const delta = new Map<string, number>();
  // Also compute total balance BEFORE the window (so we can set the starting point)
  let startingBalance = 0;

  for (const op of operations) {
    const d = new Date(op.date);
    d.setHours(0, 0, 0, 0);
    const sign = ADDING.includes(op.type)
      ? 1
      : SUBTRACTING.includes(op.type)
        ? -1
        : 0;
    if (sign === 0) continue;
    const effective = (op.quantity ?? 0) + (op.bonus ?? 0) * (sign > 0 ? 1 : 0);
    const signedDelta = sign * effective;
    if (d < start) {
      startingBalance += signedDelta;
    } else {
      const key = d.toISOString().slice(0, 10);
      delta.set(key, (delta.get(key) ?? 0) + signedDelta);
    }
  }

  // Walk day-by-day accumulating
  const series: { date: string; value: number }[] = [];
  let running = startingBalance;
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    running += delta.get(key) ?? 0;
    series.push({ date: key, value: running });
  }
  return series;
}

interface HeroValueCardProps {
  title?: string;
}

export const HeroValueCard = memo(function HeroValueCard({ title }: HeroValueCardProps) {
  const { balances, isLoading: balancesLoading } = useProgramBalances();
  const { operations, isLoading: opsLoading } = useOperations();
  const { totalExpiringMiles } = useExpirationAlerts();
  const { formatCurrency, formatNumber } = useLocalization();

  const isLoading = balancesLoading || opsLoading;

  const { patrimony, totalMiles, totalInvested, avgCostPerK, series, deltaBrl, deltaPct, hasMovement } =
    useMemo(() => {
      const patrimonyValue = balances.reduce(
        (sum, b) => sum + (b.balance * b.averageCost) / 1000,
        0,
      );
      const miles = balances.reduce((sum, b) => sum + b.balance, 0);
      const invested = balances.reduce((sum, b) => sum + b.totalInvested, 0);
      const avgCost = miles > 0 ? (invested / miles) * 1000 : 0;

      const rawSeries = buildBalanceSeries(operations, 30);

      // Convert miles series to BRL-equivalent using today's avgCost (proxy).
      const brlSeries = rawSeries.map((p) => ({
        date: p.date,
        value: (p.value * avgCost) / 1000,
      }));

      const first = brlSeries[0]?.value ?? 0;
      const last = brlSeries[brlSeries.length - 1]?.value ?? 0;
      const deltaBrlValue = last - first;
      const deltaPctValue = first > 0 ? (deltaBrlValue / first) * 100 : 0;
      // Flat 30-day window = no operations moved the balance; previous render
      // showed "+R$ 0,00 (+0.0%)" which read as broken (sas.txt P3).
      const movementDetected = brlSeries.some((p) => p.value !== first);

      return {
        patrimony: patrimonyValue,
        totalMiles: miles,
        totalInvested: invested,
        avgCostPerK: avgCost,
        series: brlSeries,
        deltaBrl: deltaBrlValue,
        deltaPct: deltaPctValue,
        hasMovement: movementDetected,
      };
    }, [balances, operations]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-7">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-14 w-64 mb-2" />
        <Skeleton className="h-4 w-80 mb-6" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Dynamic colors based on performance
  const isPositive = deltaBrl >= 0;
  const sparkColor = isPositive ? '#22c55e' : '#ef4444'; // emerald-500 or rose-500
  const sparkGradient = isPositive ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)';
  const gradientStyle = 'radial-gradient(900px 320px at -5% -30%, rgba(255, 106, 26, 0.16), transparent 58%), radial-gradient(700px 260px at 105% 120%, rgba(255, 255, 255, 0.04), transparent 62%)';
  const trendIcon = isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  const trendColorClass = isPositive ? 'text-success' : 'text-destructive';

  const formattedPatrimony = formatCurrency(patrimony);
  // Split reais/cents so cents can be dimmed
  const [intPart, centsPart] = formattedPatrimony.split(/[.,]/).length > 1
    ? [formattedPatrimony.slice(0, -3), formattedPatrimony.slice(-3)]
    : [formattedPatrimony, ''];

  return (
    <div
      className="relative min-h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-card p-6 shadow-floating sm:p-8"
      style={{
        backgroundImage: gradientStyle,
      }}
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${trendColorClass.replace('text-', 'bg-')}`} />
        {title ?? 'Valor Patrimonial'}
      </div>

      <div className="mt-1.5 break-words font-mono text-[clamp(2rem,11vw,3.5rem)] leading-none font-bold tracking-tight tabular-nums">
        {intPart}
        {centsPart && <span className="text-muted-foreground font-normal text-[28px] sm:text-[36px]">{centsPart}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        {hasMovement ? (
          <>
            <span className={`inline-flex items-center gap-1 font-semibold tabular-nums font-mono ${trendColorClass}`}>
              {trendIcon}
              {isPositive ? '+' : ''}{formatCurrency(deltaBrl)} ({isPositive ? '+' : ''}{deltaPct.toFixed(1)}%)
            </span>
            <span>nos últimos 30 dias</span>
          </>
        ) : (
          <span className="italic">Sem movimento nos últimos 30 dias</span>
        )}
      </div>

      {hasMovement && (
        <div
          className="mt-4 h-20"
          role="img"
          aria-label={`Evolução do valor patrimonial nos últimos 30 dias: ${isPositive ? 'alta' : 'queda'} de ${formatCurrency(Math.abs(deltaBrl))}, equivalente a ${Math.abs(deltaPct).toFixed(1)} por cento`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                strokeWidth={2.5}
                fill="url(#heroSpark)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contextual nudge for new users */}
      {patrimony === 0 && operations.length === 0 && (
        <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-1.5">
            <Target className="h-4 w-4" />
            Comece pelo onboarding
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete os passos iniciais para começar a controlar suas milhas
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-4 sm:gap-3">
        <KpiCell
          label="Saldo em milhas"
          value={totalMiles > 0 ? formatNumber(totalMiles) : '-'}
          sub={null}
        />
        <KpiCell
          label="Custo médio"
          value={avgCostPerK > 0 ? `${formatCurrency(avgCostPerK)}` : '-'}
          sub={avgCostPerK > 0 ? <span className="text-muted-foreground">/mil</span> : null}
        />
        <KpiCell
          label="Vencendo (90d)"
          value={totalMiles > 0 ? (totalExpiringMiles > 0 ? formatNumber(totalExpiringMiles) : '0') : '-'}
          sub={<span className="text-muted-foreground">{totalMiles > 0 ? (totalExpiringMiles > 0 ? 'Urgente' : 'Nenhuma urgência') : 'Cadastre saldos'}</span>}
          muted={totalMiles === 0}
          alert={totalExpiringMiles > 0}
        />
        <KpiCell
          label="Total investido"
          value={totalMiles > 0 ? formatCurrency(totalInvested) : '-'}
          sub={totalMiles > 0 ? <span className="text-muted-foreground">acumulado</span> : null}
        />
      </div>
    </div>
  );
});

interface KpiCellProps {
  label: string;
  value: string;
  sub: React.ReactNode;
  muted?: boolean;
  alert?: boolean;
}

function KpiCell({ label, value, sub, muted = false, alert = false }: KpiCellProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/50 px-3.5 py-2.5',
        alert && 'border-warning/30 bg-warning/10',
      )}
    >
      <div className="truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-sm font-semibold tabular-nums tracking-tight sm:text-base',
          muted && 'text-muted-foreground',
          alert && 'text-warning dark:text-warning',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
