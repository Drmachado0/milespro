import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Send, ArrowRightLeft, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HeroValueCard } from '@/components/dashboard/HeroValueCard';
import { OpportunitiesSide } from '@/components/dashboard/OpportunitiesSide';
import { ProgramsTable } from '@/components/dashboard/ProgramsTable';
import { OperationsTableMemo } from '@/components/dashboard/OperationsTableMemo';
import { IRReportBanner } from '@/components/dashboard/IRReportBanner';
import { SavingsHighlightCard } from '@/components/dashboard/SavingsHighlightCard';
import { AccumulationGoalsCard } from '@/components/dashboard/AccumulationGoalsCard';
import { ExpirationAlertsCard } from '@/components/dashboard/ExpirationAlertsCard';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { OperationsTableSkeleton } from '@/components/ui/skeleton-cards';
import { Button } from '@/components/ui/button';

import { useOnboarding } from '@/hooks/useOnboarding';
import { useOperations } from '@/hooks/useOperations';
import { useLocalization } from '@/hooks/useLocalization';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useProductTier } from '@/hooks/useProductTier';

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { shouldShowCard } = useOnboarding();
  const { user } = useAuth();
  const { canAccessModule } = useProductTier();

  const { operations, isLoading: operationsLoading } = useOperations();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const greeting = useMemo(() => buildGreeting(), []);
  const firstName = useMemo(() => {
    const fullName =
      (user?.user_metadata?.full_name as string | undefined) ??
      (user?.user_metadata?.name as string | undefined) ??
      user?.email?.split('@')[0] ??
      '';
    return fullName.split(' ')[0] || '';
  }, [user]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['operations'] }),
      queryClient.invalidateQueries({ queryKey: ['program_balances'] }),
      queryClient.invalidateQueries({ queryKey: ['market-prices'] }),
      queryClient.invalidateQueries({ queryKey: ['expiration_alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['accumulation_goals'] }),
      queryClient.invalidateQueries({ queryKey: ['price_alerts'] }),
    ]);
    setLastRefresh(new Date());
    toast.success('Dados atualizados', { duration: 2000 });
  }, [queryClient]);

  const dashboardContent = (
    <div className="space-y-6">
      {/* Greeting + primary actions */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada do seu portfólio de milhas · atualizado {lastRefresh ? formatTimeAgo(lastRefresh) : 'agora'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => navigate('/lancamentos/compra')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova Operação
          </Button>
        </div>
      </section>

      {/* Onboarding */}
      {shouldShowCard && (
        <section>
          <OnboardingCard />
        </section>
      )}

      {/* IR Banner (seasonal) — Pro+ module: income-tax / earnings reporting
          ("Informe Rendimentos") belongs to the professional tiers. */}
      {canAccessModule('informeRendimentos') && <IRReportBanner />}

      {/* HERO + OPPORTUNITIES */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        <SectionErrorBoundary fallbackTitle="Erro ao carregar patrimônio">
          <HeroValueCard />
        </SectionErrorBoundary>
        <SectionErrorBoundary fallbackTitle="Erro ao carregar oportunidades">
          <OpportunitiesSide />
        </SectionErrorBoundary>
      </section>

      {/* PROGRAMS TABLE */}
      <section>
        <SectionErrorBoundary fallbackTitle="Erro ao carregar saldos">
          <ProgramsTable />
        </SectionErrorBoundary>
      </section>

      {/* SECONDARY ACTIONS — mini-cards at the tail of the cockpit */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniAction
          label="Comprar milhas"
          sub="Registrar compra no mercado"
          icon={<ShoppingCart className="h-4 w-4" />}
          tone="primary"
          onClick={() => navigate('/lancamentos/compra')}
        />
        <MiniAction
          label="Vender milhas"
          sub="Converter saldo em R$"
          icon={<TrendingUp className="h-4 w-4" />}
          tone="pos"
          onClick={() => navigate('/lancamentos/venda')}
        />
        <MiniAction
          label="Emitir passagem"
          sub="Consumir milhas em resgate"
          icon={<Send className="h-4 w-4" />}
          tone="info"
          onClick={() => navigate('/lancamentos/passagem-emitida')}
        />
        <MiniAction
          label="Transferir pontos"
          sub="Bancos → milhas"
          icon={<ArrowRightLeft className="h-4 w-4" />}
          tone="warn"
          onClick={() => navigate('/lancamentos/transferencia-cartao')}
        />
      </section>

      {/* SAVINGS HIGHLIGHT */}
      <section>
        <SectionErrorBoundary fallbackTitle="Erro ao carregar economia">
          <SavingsHighlightCard />
        </SectionErrorBoundary>
      </section>

      {/* Secondary cards: goals + expiration + price watchers */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SectionErrorBoundary fallbackTitle="Erro ao carregar metas">
          <AccumulationGoalsCard />
        </SectionErrorBoundary>
        <SectionErrorBoundary fallbackTitle="Erro ao carregar vencimentos">
          <ExpirationAlertsCard />
        </SectionErrorBoundary>
      </section>

      {/* Recent operations */}
      <section>
        {operationsLoading ? (
          <OperationsTableSkeleton rowCount={5} />
        ) : (
          <OperationsTableMemo operations={operations} title={t('dashboard.recentOperations')} />
        )}
      </section>
    </div>
  );

  return (
    <DashboardLayout title={t('dashboard.title')}>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
          {dashboardContent}
        </PullToRefresh>
      ) : (
        dashboardContent
      )}
    </DashboardLayout>
  );
}

function buildGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

type MiniTone = 'primary' | 'pos' | 'info' | 'warn';

const TONE_CLASSES: Record<MiniTone, { icon: string }> = {
  primary: { icon: 'bg-primary/10 text-primary' },
  pos: { icon: 'bg-success/10 text-success' },
  info: { icon: 'bg-info/10 text-info' },
  warn: { icon: 'bg-warning/10 text-warning' },
};

interface MiniActionProps {
  label: string;
  sub: string;
  icon: React.ReactNode;
  tone: MiniTone;
  onClick: () => void;
}

function MiniAction({ label, sub, icon, tone, onClick }: MiniActionProps) {
  const tc = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tc.icon} shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-200`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
    </button>
  );
}
