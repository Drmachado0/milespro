import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Star } from 'lucide-react';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useLocalization } from '@/hooks/useLocalization';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type OppKind = 'sell' | 'buy' | 'expiring';

interface Opportunity {
  id: string;
  kind: OppKind;
  program: string;
  title: string;
  descMain: string;
  descSub?: string;
  priority: number;
  cta?: { label: string; path: string };
  roiPct?: number;
}

const SELL_MARGIN_THRESHOLD = 1.15; // sell when market > cost * 1.15
const BUY_DISCOUNT_THRESHOLD = 0.9;  // buy when market < cost * 0.9
const MIN_SELL_BALANCE = 10_000;

/**
 * Right-hand column of prioritized opportunities.
 * First (featured) card gets the primary accent; remaining render compact.
 */
export const OpportunitiesSide = memo(function OpportunitiesSide() {
  const navigate = useNavigate();
  const { formatCurrency, formatNumber } = useLocalization();
  const { balances, isLoading: balancesLoading } = useProgramBalances();
  const { prices, isLoading: pricesLoading } = useMarketPrices();

  const isLoading = balancesLoading || pricesLoading;

  const opportunities = useMemo<Opportunity[]>(() => {
    const out: Opportunity[] = [];

    for (const balance of balances) {
      const market = prices?.find((p) => p.program === balance.program);
      if (!market) continue;
      const { averageCost, balance: miles, program } = balance;

      if (
        averageCost > 0 &&
        miles >= MIN_SELL_BALANCE &&
        market.sell_price > averageCost * SELL_MARGIN_THRESHOLD
      ) {
        const profit = (market.sell_price - averageCost) * (miles / 1000);
        const grossBrl = (market.sell_price * miles) / 1000;
        const roiPct = ((market.sell_price - averageCost) / averageCost) * 100;
        out.push({
          id: `sell-${program}`,
          kind: 'sell',
          program,
          title: `Venda suas ${program} por ${formatCurrency(grossBrl)}`,
          descMain: `Lucro estimado ${formatCurrency(profit)}`,
          descSub: `sobre ${formatNumber(miles)} milhas`,
          priority: profit,
          cta: { label: 'Ver proposta', path: '/lancamentos/venda' },
          roiPct,
        });
      }

      if (averageCost > 0 && market.buy_price < averageCost * BUY_DISCOUNT_THRESHOLD) {
        out.push({
          id: `buy-${program}`,
          kind: 'buy',
          program,
          title: `Preço de mercado ${formatCurrency(market.buy_price)}/mil`,
          descMain: `Abaixo da sua média histórica`,
          priority: (averageCost - market.buy_price) * 10,
          cta: { label: 'Comprar', path: '/lancamentos/compra' },
        });
      } else if (market.buy_price > 0) {
        // Still include a neutral hint so the panel isn't empty for new users
        out.push({
          id: `hint-${program}`,
          kind: 'buy',
          program,
          title: `Preço de mercado ${formatCurrency(market.buy_price)}/mil`,
          descMain: 'Similar à sua última referência',
          priority: 1,
        });
      }
    }

    return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [balances, prices, formatCurrency, formatNumber]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    const hasBalances = balances.length > 0;
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
        <div className="mb-2 text-sm font-semibold text-foreground">
          {hasBalances ? 'Nenhuma oportunidade agora' : 'Cadastre seus saldos primeiro'}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {hasBalances
            ? 'Alertas aparecem aqui quando o mercado abre janelas.'
            : 'Adicione seus programas de milhas para ver oportunidades.'}
        </p>
        {!hasBalances && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/lancamentos/entrada')}
            className="gap-2"
          >
            <Plus className="h-3 w-3" />
            Cadastrar saldo
          </Button>
        )}
      </div>
    );
  }

  const [featured, ...secondary] = opportunities;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Oportunidades</div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {opportunities.length} ativ{opportunities.length === 1 ? 'a' : 'as'}
        </span>
      </div>

      <OpportunityCard opp={featured} featured onCtaClick={(p) => navigate(p)} index={0} />
      {secondary.map((o, i) => (
        <OpportunityCard key={o.id} opp={o} onCtaClick={(p) => navigate(p)} index={i + 1} />
      ))}

      <button
        type="button"
        onClick={() => navigate('/alertas')}
        className="mt-1 text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Ver todos os sinais →
      </button>
    </div>
  );
});

function OpportunityCard({
  opp,
  featured = false,
  onCtaClick,
  index = 0,
}: {
  opp: Opportunity;
  featured?: boolean;
  onCtaClick: (path: string) => void;
  index?: number;
}) {
  const kindLabel =
    opp.kind === 'sell'
      ? 'OPORTUNIDADE DE VENDA'
      : opp.kind === 'buy'
        ? 'DICA DE COMPRA'
        : 'VENCIMENTO PRÓXIMO';
  const kindColor =
    opp.kind === 'sell'
      ? 'text-success'
      : opp.kind === 'buy'
        ? 'text-info'
        : 'text-warning';

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-all duration-300 animate-fade-in',
        featured
          ? 'border-primary/40 bg-card hover:bg-card/80 shadow-md shadow-primary/5'
          : 'border-border bg-card hover:bg-muted/40',
      )}
      style={{
        animationDelay: `${index * 75}ms`,
        ...(featured ? {
            backgroundImage:
              'radial-gradient(400px 100px at 0% 0%, rgba(232, 89, 12, 0.10), transparent)',
          } : {}),
      }}
      onClick={() => opp.cta && onCtaClick(opp.cta.path)}
    >
      {featured && (
        <div className="absolute -top-2 -left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-warning to-primary text-[10px] font-bold text-white shadow-sm animate-pulse">
          <Star className="h-2.5 w-2.5 fill-current" /> Destaque
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em]">
        <span className={kindColor}>{kindLabel}</span>
        <span className="text-muted-foreground/70">{opp.program}</span>
      </div>
      <div className="text-sm font-semibold leading-snug text-foreground">
        {opp.title}
      </div>
      <div className="font-mono text-xs text-muted-foreground tabular-nums">
        {opp.descMain}
        {opp.descSub ? <span className="ml-1 opacity-75">{opp.descSub}</span> : null}
        {opp.roiPct !== undefined && opp.kind === 'sell' && (
          <span className="ml-2 px-1.5 py-0.5 rounded bg-success/15 text-success dark:text-success text-[10px] font-semibold">
            +{opp.roiPct.toFixed(1)}% ROI
          </span>
        )}
      </div>
      {opp.cta && featured && (
        <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-[gap]">
          {opp.cta.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}
