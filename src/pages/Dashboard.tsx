import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Send, ArrowRightLeft, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { shouldShowCard } = useOnboarding();
  const { user } = useAuth();
  const { canAccessModule } = useProductTier();

  const { operations, isLoading: operationsLoading } = useOperations();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useGSAP(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    gsap.from('[data-dashboard-header]', {
      autoAlpha: 0,
      y: 18,
      duration: 0.65,
      ease: 'power3.out',
    });

    gsap.from('[data-dashboard-focus]', {
      autoAlpha: 0,
      scale: 0.96,
      duration: 0.8,
      ease: 'power3.out',
      transformOrigin: 'center center',
    });

    gsap.utils.toArray<HTMLElement>('[data-dashboard-section]').forEach((section) => {
      gsap.from(section, {
        autoAlpha: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 88%', once: true },
      });
    });

    gsap.from('[data-dashboard-stack]', {
      autoAlpha: 0,
      y: 42,
      scale: 0.985,
      duration: 0.75,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '[data-dashboard-planning]',
        start: 'top 84%',
        once: true,
      },
    });
  }, { scope: dashboardRef });

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
    <div ref={dashboardRef} className="w-full max-w-full space-y-8 overflow-x-hidden pb-8 lg:space-y-10">
      <section data-dashboard-header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 px-5 py-6 shadow-sm backdrop-blur-sm sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-5xl">
            <h1 className="w-full max-w-5xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl lg:text-4xl">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Seu portfólio de milhas, oportunidades e próximos movimentos em uma visão consolidada.
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground/80">
              Atualizado {lastRefresh ? formatTimeAgo(lastRefresh) : 'agora'}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button className="flex-1 shadow-sm sm:flex-none" size="sm" onClick={() => navigate('/lancamentos/compra')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nova Operação
            </Button>
          </div>
        </div>
      </section>

      {shouldShowCard && <section data-dashboard-section><OnboardingCard /></section>}
      {canAccessModule('informeRendimentos') && <section data-dashboard-section><IRReportBanner /></section>}

      <section data-dashboard-section className="grid grid-flow-dense grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div data-dashboard-focus className="lg:col-span-8">
          <SectionErrorBoundary fallbackTitle="Erro ao carregar patrimônio"><HeroValueCard /></SectionErrorBoundary>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/55 p-4 shadow-sm lg:col-span-4 lg:p-5">
          <SectionErrorBoundary fallbackTitle="Erro ao carregar oportunidades"><OpportunitiesSide /></SectionErrorBoundary>
        </div>
      </section>

      <section data-dashboard-section aria-label="Ações rápidas" className="grid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:grid-cols-2 lg:flex">
        <MiniAction
          label="Comprar milhas"
          sub="Registrar compra no mercado"
          icon={<ShoppingCart className="h-4 w-4" />}
          onClick={() => navigate('/lancamentos/compra')}
        />
        <MiniAction
          label="Vender milhas"
          sub="Converter saldo em R$"
          icon={<TrendingUp className="h-4 w-4" />}
          onClick={() => navigate('/lancamentos/venda')}
        />
        <MiniAction
          label="Emitir passagem"
          sub="Consumir milhas em resgate"
          icon={<Send className="h-4 w-4" />}
          onClick={() => navigate('/lancamentos/passagem-emitida')}
        />
        <MiniAction
          label="Transferir pontos"
          sub="Bancos → milhas"
          icon={<ArrowRightLeft className="h-4 w-4" />}
          onClick={() => navigate('/lancamentos/transferencia-cartao')}
        />
      </section>

      <section data-dashboard-section className="space-y-4">
        <SectionHeading title="Seu portfólio" description="Distribuição, valor de mercado e economia acumulada." />
        <div className="grid grid-flow-dense grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SectionErrorBoundary fallbackTitle="Erro ao carregar saldos"><ProgramsTable /></SectionErrorBoundary>
          </div>
          <div className="lg:col-span-4 [&>div]:h-full [&>div>div]:h-full">
            <SectionErrorBoundary fallbackTitle="Erro ao carregar economia"><SavingsHighlightCard /></SectionErrorBoundary>
          </div>
        </div>
      </section>

      <section data-dashboard-section data-dashboard-planning className="space-y-4">
        <SectionHeading title="Planejamento" description="Metas e prazos que pedem sua atenção." />
        <div className="grid grid-flow-dense grid-cols-1 gap-5 lg:grid-cols-12">
          <div data-dashboard-stack className="lg:col-span-6">
            <SectionErrorBoundary fallbackTitle="Erro ao carregar metas"><AccumulationGoalsCard /></SectionErrorBoundary>
          </div>
          <div data-dashboard-stack className="lg:col-span-6">
            <SectionErrorBoundary fallbackTitle="Erro ao carregar vencimentos"><ExpirationAlertsCard /></SectionErrorBoundary>
          </div>
        </div>
      </section>

      <section data-dashboard-section className="space-y-4">
        <SectionHeading title="Atividade recente" description="Os últimos movimentos registrados no seu portfólio." />
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

interface MiniActionProps {
  label: string;
  sub: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function MiniAction({ label, sub, icon, onClick }: MiniActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-20 w-full items-center gap-3 border-b border-border/70 bg-card p-4 text-left transition-[flex-grow,background-color] duration-300 last:border-b-0 hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:[&:nth-child(odd)]:border-r lg:flex-1 lg:border-b-0 lg:border-r lg:hover:flex-[1.12] lg:last:border-r-0"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-500 ease-out group-hover:scale-105">
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

interface SectionHeadingProps {
  title: string;
  description: string;
}

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{title}</h2>
      <p className="max-w-lg text-sm text-muted-foreground sm:text-right">{description}</p>
    </div>
  );
}
