import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useProgramBalances, type ProgramBalance } from '@/hooks/useProgramBalances';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useLocalization } from '@/hooks/useLocalization';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProgramInfo } from '@/data/programs';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Category = 'all' | 'pontos' | 'cias' | 'hoteis';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Todos',
  pontos: 'Pontos',
  cias: 'Cias Aéreas',
  hoteis: 'Hotéis',
};

function resolveCategory(program: string): 'pontos' | 'cias' | 'hoteis' {
  const info = getProgramInfo(program);
  if (!info) return 'pontos';
  if (info.category === 'pontos') return 'pontos';
  if (info.category === 'hotels') return 'hoteis';
  return 'cias';
}

interface TabDef { key: Category; label: string; count: number }

export const ProgramsTable = memo(function ProgramsTable() {
  const navigate = useNavigate();
  const { balances, isLoading } = useProgramBalances();
  const { prices } = useMarketPrices();
  const { formatCurrency, formatNumber } = useLocalization();
  const isMobile = useIsMobile();
  const [activeCat, setActiveCat] = useState<Category>('all');

  const { rows, tabs, totalMiles, activeCount } = useMemo(() => {
    const enriched = balances.map((b) => {
      const cat = resolveCategory(b.program);
      const market = prices?.find((p) => p.program === b.program);
      const marketSellPrice = market?.sell_price ?? b.averageCost;
      const estimatedBrl = (b.balance * marketSellPrice) / 1000;
      return { ...b, category: cat, marketSellPrice, estimatedBrl };
    });
    const totalMilesValue = enriched.reduce((sum, r) => sum + r.balance, 0);
    const withAlloc = enriched.map((r) => ({
      ...r,
      allocation: totalMilesValue > 0 ? (r.balance / totalMilesValue) * 100 : 0,
    }));
    const filtered = activeCat === 'all' ? withAlloc : withAlloc.filter((r) => r.category === activeCat);
    const sorted = filtered.sort((a, b) => b.balance - a.balance);

    const counts = withAlloc.reduce(
      (acc, r) => {
        acc[r.category] += 1;
        return acc;
      },
      { pontos: 0, cias: 0, hoteis: 0 } as Record<'pontos' | 'cias' | 'hoteis', number>,
    );
    const tabsList: TabDef[] = [
      { key: 'all', label: CATEGORY_LABELS.all, count: withAlloc.length },
      { key: 'pontos', label: CATEGORY_LABELS.pontos, count: counts.pontos },
      { key: 'cias', label: CATEGORY_LABELS.cias, count: counts.cias },
      { key: 'hoteis', label: CATEGORY_LABELS.hoteis, count: counts.hoteis },
    ];
    // Canonical "Programas Ativos" count = programs with positive balance.
    // Matches the KPI on /analises (Analises.tsx) and the
    // ProgramDistributionChart subtitle so all three surfaces agree.
    const activeProgramsCount = withAlloc.filter((r) => r.balance > 0).length;
    return { rows: sorted, tabs: tabsList, totalMiles: totalMilesValue, activeCount: activeProgramsCount };
  }, [balances, prices, activeCat]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-1">
        <Skeleton className="h-10 rounded-xl" />
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Saldos por Programa</h2>
        <span className="text-sm text-muted-foreground">
          {activeCount} {activeCount === 1 ? 'programa ativo' : 'programas ativos'}
        </span>
      </div>
      <div className="inline-flex gap-1 self-start rounded-lg border border-border bg-card p-[3px] sm:self-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveCat(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
              activeCat === t.key
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className="rounded-full bg-border/60 px-1.5 py-px text-[10px] font-semibold text-foreground/80">
              {t.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum programa nesta categoria</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Registre operações em programas para vê-los aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {isMobile ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <MobileRow
              key={row.program}
              row={row}
              totalMiles={totalMiles}
              onClick={() => navigate(`/programa/${encodeURIComponent(row.program)}`)}
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(220px,1.4fr)_minmax(160px,1.3fr)_120px_130px_110px_32px] items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            <div>Programa</div>
            <div>Alocação</div>
            <div className="text-right">Saldo</div>
            <div className="text-right">Valor estimado</div>
            <div className="text-right">Custo médio</div>
            <div />
          </div>
          {rows.map((row, i) => (
            <DesktopRow
              key={row.program}
              row={row}
              isLast={i === rows.length - 1}
              onClick={() => navigate(`/programa/${encodeURIComponent(row.program)}`)}
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface RowProps {
  row: ProgramBalance & { allocation: number; estimatedBrl: number; marketSellPrice: number };
  onClick: () => void;
  formatNumber: (n: number) => string;
  formatCurrency: (n: number) => string;
}

function DesktopRow({
  row,
  onClick,
  isLast,
  formatNumber,
  formatCurrency,
}: RowProps & { isLast: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid w-full grid-cols-[minmax(220px,1.4fr)_minmax(160px,1.3fr)_120px_130px_110px_32px] items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
        !isLast && 'border-b border-border/50',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProgramLogo program={row.program} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.program}</div>
          <div className="text-[11px] text-muted-foreground">
            {row.operationsCount} {row.operationsCount === 1 ? 'operação' : 'operações'}
          </div>
        </div>
      </div>
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-warning"
            style={{ width: `${Math.max(row.allocation, 1)}%` }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground/80">
          {row.allocation.toFixed(1)}% do portfólio
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-medium tabular-nums">{formatNumber(row.balance)}</div>
        <div className="font-mono text-[10px] text-muted-foreground/70">milhas</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-medium tabular-nums">
          {formatCurrency(row.estimatedBrl)}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/70">
          @ {formatCurrency(row.marketSellPrice)}/mil
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm tabular-nums">
          {row.averageCost > 0 ? `${formatCurrency(row.averageCost)}/mil` : '-'}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </button>
  );
}

function MobileRow({
  row,
  totalMiles,
  onClick,
  formatNumber,
  formatCurrency,
}: RowProps & { totalMiles: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40 active:scale-[0.99]"
    >
      <ProgramLogo program={row.program} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{row.program}</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatNumber(row.balance)}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-warning"
            style={{ width: `${Math.max(row.allocation, 1)}%` }}
          />
        </div>
        <div className="mt-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCurrency(row.estimatedBrl)}</span>
          <span className="font-mono tabular-nums">
            {totalMiles > 0 ? `${row.allocation.toFixed(1)}%` : '-'}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </button>
  );
}
