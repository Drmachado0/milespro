import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Star, Zap, Users, FileText, Infinity as InfinityIcon, BarChart3, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocalization } from '@/hooks/useLocalization';
import { useAuth } from '@/hooks/useAuth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import { createSubscriptionLead } from '@/lib/subscriptionLeads';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { extractAsaasError, mapAsaasError } from '@/lib/asaasErrors';
import { cn } from '@/lib/utils';

// Orange color: #F97316 (Tailwind orange-500)

const renderValue = (value: boolean | string) => {
  if (typeof value === 'string') return <span className="text-sm font-medium">{value}</span>;
  return value ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-muted-foreground/50" />;
};

// Plan 02 canonical 3-tier (D-01): legacy mid-tier fields == new 'pro'; legacy
// top-tier fields == new 'vip'.
const features = [
  { name: 'Perfis/Usuários', free: '1', pro: '1', vip: '5' },
  { name: 'Programas suportados', free: '1', pro: 'Todos', vip: 'Todos' },
  { name: 'Operações/mês', free: '20', pro: 'Ilimitado', vip: 'Ilimitado' },
  { name: 'Histórico', free: '30 dias', pro: 'Ilimitado', vip: 'Ilimitado' },
  { name: 'Dashboard completo', free: false, pro: true, vip: true },
  { name: 'Alertas de vencimento', free: true, pro: true, vip: true },
  { name: 'Atualização automática de saldos', free: false, pro: true, vip: true },
  { name: 'Simulador completo com histórico', free: false, pro: true, vip: true },
  { name: 'Recomendações (emitir/transferir/vender)', free: false, pro: true, vip: true },
  { name: 'Gestão de titulares (CPFs)', free: false, pro: true, vip: true },
  { name: 'Cadastro de cartões', free: false, pro: true, vip: true },
  { name: 'Controle de Sala VIP', free: false, pro: true, vip: true },
  { name: 'Compra Turbinada', free: false, pro: true, vip: true },
  { name: 'Bumerangue', free: false, pro: true, vip: true },
  { name: 'Clube Assinante', free: false, pro: true, vip: true },
  { name: 'Simuladores avançados', free: false, pro: false, vip: true },
  { name: 'Relatórios com exportação CSV/Excel', free: false, pro: false, vip: true },
  { name: 'Dashboards focados em lucro', free: false, pro: false, vip: true },
  { name: 'Suporte via WhatsApp prioritário', free: false, pro: false, vip: true },
];

const plans = [
  { 
    id: 'free', 
    name: 'Free', 
    monthlyPrice: 0,
    semiannualPrice: 0,
    semiannualMonthly: 0,
    annualPrice: 0,
    annualMonthly: 0,
    description: 'Ideal para quem está começando', 
    icon: Star, 
    features: [
      'Cadastro de 1 programa de pontos',
      'Visão unificada dos seus saldos',
      'Alertas básicos de vencimento',
      'Simulador simples de valor do milheiro',
      'Dashboard básico por programa',
      'Histórico de 30 dias',
    ], 
    popular: false,
    note: 'Sem compromisso, comece hoje',
  },
  {
    // Plan 02 D-01: legacy mid-tier id -> canonical 'pro' id.
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 37.90,
    semiannualPrice: 203.46,
    semiannualMonthly: 33.91,
    annualPrice: 363.84,
    annualMonthly: 30.32,
    description: 'Para quem realmente usa milhas',
    icon: Zap,
    features: [
      'Integração com todos os programas (Livelo, Esfera, Smiles, TudoAzul, Latam Pass e outros)',
      'Atualização automática diária dos saldos',
      'Alertas completos de vencimento',
      'Simulador completo com histórico recente',
      'Recomendações: emitir, transferir ou vender',
      'Histórico completo de movimentações',
      'Dashboard detalhado por programa e banco',
      'Gestão de múltiplos cartões',
      'Controle de acesso à Sala VIP',
      'Suporte por e-mail em até 24h',
    ],
    popular: true,
    note: 'Uma emissão bem feita paga vários meses',
  },
  {
    // Plan 02 D-01: legacy top-tier 'pro' id -> canonical 'vip' id.
    id: 'vip',
    name: 'VIP',
    monthlyPrice: 67.90,
    semiannualPrice: 365.10,
    semiannualMonthly: 60.85,
    annualPrice: 652.32,
    annualMonthly: 54.36,
    description: 'Gestão profissional de milhas',
    icon: Users,
    features: [
      'Tudo do Pro +',
      'Gestão de até 5 perfis (família ou clientes)',
      'Múltiplas contas por programa em cada perfil',
      'Atualizações mais frequentes de saldos',
      'Alertas avançados: vencimento + oportunidades',
      'Cenários avançados (transferência, venda, emissão)',
      'Relatórios com exportação CSV/Excel',
      'Dashboards focados em lucro com milhas',
      'Suporte prioritário via WhatsApp',
    ],
    popular: false,
    note: 'R$ 13,58/pessoa para até 5 perfis',
  },
];

const faqs = [
  { 
    question: 'Posso cancelar a qualquer momento?', 
    answer: 'Sim! Você pode cancelar sua assinatura a qualquer momento, sem multa ou burocracia. Seu acesso continua até o fim do período pago.' 
  },
  { 
    question: 'Como funciona o upgrade de plano?', 
    answer: 'Ao fazer upgrade, você paga apenas a diferença proporcional ao tempo restante do seu plano atual. O novo plano é ativado imediatamente.' 
  },
  { 
    question: 'Quais formas de pagamento são aceitas?', 
    answer: 'Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), PIX e boleto bancário. Para planos semestrais e anuais, parcelamos em até 12x no cartão.' 
  },
  {
    question: 'O que acontece se eu ultrapassar o limite de operações no plano Gratuito?',
    answer: 'Ao atingir 20 operações/mês no plano Gratuito, você será convidado a fazer upgrade para o Pro. Suas operações anteriores permanecem salvas e acessíveis.'
  },
  {
    question: 'Qual a diferença entre Pro e VIP?',
    answer: 'O Pro é para viajantes individuais que querem controle total das suas milhas. O VIP suporta até 5 perfis (família ou clientes) com login individual, dashboards focados em lucro e suporte prioritário via WhatsApp. Ideal para quem gerencia milhas profissionalmente.'
  },
  {
    question: 'Posso adicionar mais usuários depois?',
    answer: 'Sim! No plano Pro você tem 1 perfil, e no VIP até 5 perfis (família ou clientes). Para mais perfis, entre em contato conosco.'
  },
  {
    question: 'Como funciona a garantia?',
    answer: 'Você pode usar o plano Gratuito por tempo ilimitado. Também oferecemos 7 dias de garantia incondicional nos planos pagos: se não gostar, devolvemos integralmente o valor da primeira cobrança, sem perguntas, sem burocracia. Veja os Termos de Uso (seção Garantia) para detalhes.'
  },
  {
    question: 'Quanto tempo demora para confirmar o pagamento?',
    answer: 'Cartão de crédito é processado imediatamente. Pix tem confirmação em até 4 horas. Boleto bancário tem confirmação em até 2 dias úteis após o pagamento (processamento pela Asaas).'
  },
  { 
    question: 'Os descontos semestral e anual são cumulativos?', 
    answer: 'Não, você escolhe um período de faturamento: mensal (sem desconto), semestral (-10%) ou anual (-20%). O desconto já está aplicado no preço exibido.' 
  },
];

export default function Assinatura() {
  const { plan: currentPlan, limits, isFree, isPro, isVip, isActive } = useSubscription();
  const { user } = useAuth();
  const { formatCurrency } = useLocalization();
  const telemetry = useTelemetry();
  const isIOS = useIsIOSCapacitor();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'semiannual' | 'annual'>('monthly');

  // Plan 02-07 (PAY-05) — show the Asaas customer-area link only to users
  // with a currently active paid subscription. Free users see the upgrade
  // path instead; canceled/expired Pro/VIP fall through to the standard
  // pricing cards. Asaas does not expose a per-customer signed deep link
  // in its public API today; the public /customer-area URL asks the user
  // to log in once with CPF + email. Revisit if Asaas ships signed links.
  const hasActiveSubscription = (isPro || isVip) && isActive;

  // Plan 02-06 (D-10 / CRIT-03) — iOS Path C: NO pricing UI on iOS app.
  // Apple Multiplatform Services exemption (3.1.3b) permits managing the
  // subscription on the web, but the native iOS bundle must contain zero
  // pricing strings and zero clickable links to a web checkout. Show a
  // neutral panel with no URL link — operator-side support flow will
  // explain how to access the web app.
  if (isIOS) {
    return (
      <DashboardLayout title="Assinatura">
        <div className="container mx-auto py-12 text-center space-y-3">
          <h1 className="text-2xl font-bold">Gerencie sua assinatura</h1>
          {/* NO clickable link to the web — per Apple 3.1.3(b) Multiplatform
              Services exemption — so this is plain text, not an anchor.
              The domain is intentionally NOT spelled inline to prevent iOS
              auto-linkification (defense in depth on top of
              `format-detection: url=no` in index.html). */}
          <p className="text-muted-foreground max-w-md mx-auto">
            Sua assinatura MilesPro é gerenciada pelo navegador web em outro
            dispositivo. Acesse de um computador ou tablet para visualizar
            planos, alterar forma de pagamento ou cancelar.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const usagePercentage = limits.maxOperationsPerMonth
    ? (limits.currentMonthOperations / limits.maxOperationsPerMonth) * 100
    : 0;

  const CurrentIcon = isVip ? Users : isPro ? Zap : Star;

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return 'Grátis';
    
    switch (billingPeriod) {
      case 'monthly':
        return formatCurrency(plan.monthlyPrice);
      case 'semiannual':
        return formatCurrency(plan.semiannualMonthly);
      case 'annual':
        return formatCurrency(plan.annualMonthly);
    }
  };

  const getTotalPrice = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return null;
    
    switch (billingPeriod) {
      case 'semiannual':
        return formatCurrency(plan.semiannualPrice);
      case 'annual':
        return formatCurrency(plan.annualPrice);
      default:
        return null;
    }
  };

  const getEquivalentMonthlyNote = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return null;
    
    switch (billingPeriod) {
      case 'semiannual':
        return `equivale a ${formatCurrency(plan.semiannualMonthly)}/mês`;
      case 'annual':
        return `equivale a ${formatCurrency(plan.annualMonthly)}/mês`;
      default:
        return null;
    }
  };

  const scrollToPlans = () => {
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPlanRank = (planId: string) => ({ free: 0, pro: 1, vip: 2 }[planId] ?? 0);

  const getPlanCtaLabel = (plan: typeof plans[0]) => {
    if (plan.id === currentPlan) return 'Plano atual';
    if (getPlanRank(plan.id) < getPlanRank(currentPlan)) return 'Incluído no seu plano';
    if (plan.monthlyPrice === 0) return 'Começar grátis';
    // Plan 02-06 D-15 — direct purchase via Asaas, no "Solicitar" stepping stone.
    return `Assinar ${plan.name}`;
  };

  const isPlanCtaDisabled = (plan: typeof plans[0]) => {
    return plan.id === currentPlan || getPlanRank(plan.id) < getPlanRank(currentPlan);
  };

  // Plan 02-06 (PAY-04 / D-11 / D-15) — handlePlanCta now invokes the
  // create-checkout-session edge function (W2a) and redirects to Asaas
  // hosted checkout. The legacy sales-WhatsApp env var and wa.me link are
  // gone (D-15: VIP self-serve via Asaas, no human-in-the-loop).
  // subscription_leads remains as the FALLBACK shadow log when the Asaas
  // call fails — never as the primary path.
  const handlePlanCta = async (plan: typeof plans[0]) => {
    if (isPlanCtaDisabled(plan)) return;

    if (plan.monthlyPrice === 0) {
      toast.success('Plano gratuito já disponível no cadastro.');
      return;
    }

    // Defensive: outer iOS guard already returns above, but keep this for
    // safety in case the early-return regresses.
    if (isIOS) {
      toast.info('Gerencie sua assinatura em milespro.net.br pelo navegador.');
      return;
    }

    const planId = plan.id as 'pro' | 'vip';
    const price = getDisplayPrice(plan);
    const total = getTotalPrice(plan);

    // Telemetry BEFORE the redirect (W1b chokepoint). Fires even when the
    // Asaas call eventually fails — we want a complete funnel of intent.
    const displayValue =
      billingPeriod === 'monthly'
        ? plan.monthlyPrice
        : billingPeriod === 'semiannual'
          ? plan.semiannualPrice
          : plan.annualPrice;

    telemetry.trackStartedCheckout({
      plan: planId,
      cycle: billingPeriod,
      value: displayValue,
    });

    // Primary path: create-checkout-session (W2a) returns the Asaas hosted
    // checkout URL. body shape locked at the W2a interface (plan + cycle).
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { plan: planId, cycle: billingPeriod },
    });

    const checkoutUrl =
      typeof data === 'object' && data !== null && 'checkoutUrl' in data
        ? String((data as { checkoutUrl?: unknown }).checkoutUrl ?? '')
        : '';

    if (error || !checkoutUrl) {
      // P1-4 — pull sanitized {code, details} from the edge fn error body
      // (already PII-scrubbed server-side by sanitizeAsaasError) and map
      // to a specific pt-BR toast so the user knows whether the failure
      // was CPF, cartão, or a transient infra issue.
      const info = await extractAsaasError(error);
      const message = mapAsaasError(info);

      // Shadow log to subscription_leads (D-11). Marks asaas_failure so the
      // operator can triage. Best-effort: ignore failures here too — we
      // surface the toast either way.
      logger.warn(
        '[Assinatura] create-checkout-session failed',
        info.code ?? error?.message ?? 'no checkoutUrl',
      );
      try {
        await createSubscriptionLead({
          plan: planId,
          billingPeriod,
          source: 'dashboard_subscription',
          email: user?.email || null,
          userId: user?.id || null,
          priceLabel: `${price}/mês`,
          totalLabel: total,
          whatsappSent: false,
          metadata: {
            currentPlan,
            sourcePath: window.location.pathname,
            asaasError: info.code ?? error?.message ?? 'no_checkout_url',
            via: 'create-checkout-session',
            failureKind: 'asaas_failure',
          },
        });
      } catch (leadErr) {
        logger.warn('[Assinatura] subscription_leads fallback failed', String(leadErr));
      }
      toast.error(message);
      return;
    }

    // Redirect to Asaas hosted checkout.
    window.location.href = checkoutUrl;
  };

  return (
    <DashboardLayout title="Assinatura">
      <div className="space-y-8 pb-8">
        <PageHeader
          eyebrow="Plano"
          icon={<Star className="h-5 w-5" />}
          title="Minha Assinatura"
          subtitle="Gerencie seu plano e acompanhe seu uso"
        />

        {/* Current Plan Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl grid place-items-center",
                  isVip ? "bg-warning/15" : isPro ? "bg-primary/15" : "bg-muted"
                )}>
                  <CurrentIcon className={cn(
                    "h-6 w-6",
                    isVip ? "text-warning" : isPro ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Plano {isVip ? 'VIP' : isPro ? 'Pro' : 'Gratuito'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {isVip
                      ? 'Para famílias que viajam juntas'
                      : isPro
                        ? 'Para viajantes inteligentes'
                        : 'Para quem está começando'}
                  </CardDescription>
                </div>
              </div>
              {!isVip && (
                <Button
                  onClick={scrollToPlans}
                  className="shadow-md"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Fazer upgrade
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Operations */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Operações</span>
                </div>
                {limits.maxOperationsPerMonth ? (
                  <>
                    <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                      {limits.currentMonthOperations}
                      <span className="text-base font-normal text-muted-foreground">/{limits.maxOperationsPerMonth}</span>
                    </p>
                    <Progress
                      value={usagePercentage}
                      className={cn(
                        "mt-2 h-1.5",
                        usagePercentage >= 80 && "bg-warning/15 [&>div]:bg-warning"
                      )}
                    />
                    {usagePercentage >= 80 && (
                      <p className="text-xs text-warning mt-1 font-mono tabular-nums">
                        {Math.round(100 - usagePercentage)}% restante
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <InfinityIcon className="h-5 w-5 text-success" />
                    <span className="text-xl font-bold">Ilimitado</span>
                  </div>
                )}
              </div>

              {/* Users */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Usuários</span>
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                  1
                  <span className="text-base font-normal text-muted-foreground">
                    /{isVip ? '5' : '1'}
                  </span>
                </p>
              </div>

              {/* Programs */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Programas</span>
                </div>
                {isFree ? (
                  <>
                    <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                      {limits.currentProgramsCount}
                      <span className="text-base font-normal text-muted-foreground">
                        /{limits.maxPrograms || 3}
                      </span>
                    </p>
                    {limits.maxPrograms && limits.currentProgramsCount >= limits.maxPrograms && (
                      <p className="text-xs text-warning mt-1">Limite atingido</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <InfinityIcon className="h-5 w-5 text-success" />
                    <span className="text-xl font-bold">Ilimitado</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20 text-sm px-3 py-1 gap-1"
                >
                  <Check className="h-3 w-3" />
                  Ativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan 02-07 (PAY-05) — Active subscription management panel.
            Renders only for paying subscribers (isActive && (isPro || isVip)).
            Links to Asaas hosted customer area where the user can update
            their payment method, download NFS-e PDFs, view invoice history,
            and cancel. The Asaas portal authenticates by CPF + email. */}
        {hasActiveSubscription && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Você já tem uma assinatura ativa</h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Gerencie sua forma de pagamento, baixe a NFS-e, consulte o histórico de cobranças ou cancele direto no portal Asaas.
                  </p>
                </div>
                <Button asChild className="shadow-md">
                  <a
                    href="https://www.asaas.com/customer-area"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Gerenciar assinatura
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Section */}
        <div id="plans-section" className="space-y-6 scroll-mt-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Escolha seu plano</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Desbloqueie todo o potencial da gestão de milhas com nossos planos
            </p>
            
            {/* Billing Period Toggle */}
            <div className="inline-flex items-center bg-muted rounded-xl p-1.5 gap-1 shadow-inner">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "px-5 py-2.5 rounded-lg font-medium transition-all text-sm",
                  billingPeriod === 'monthly'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('semiannual')}
                className={cn(
                  "px-5 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center gap-2",
                  billingPeriod === 'semiannual'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Semestral
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-bold",
                  billingPeriod === 'semiannual'
                    ? "bg-white/20 text-white"
                    : "bg-success/20 text-success"
                )}>
                  -10%
                </span>
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={cn(
                  "px-5 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center gap-2",
                  billingPeriod === 'annual'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Anual
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-bold",
                  billingPeriod === 'annual'
                    ? "bg-white/20 text-white"
                    : "bg-success/20 text-success"
                )}>
                  -20%
                </span>
              </button>
            </div>
          </div>
          
          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === currentPlan;
              const PlanIcon = plan.icon;
              const totalPrice = getTotalPrice(plan);
              const equivalentNote = getEquivalentMonthlyNote(plan);
              
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative transition-all hover:shadow-lg",
                    plan.popular && "border-primary border-2 shadow-lg shadow-primary/10 scale-[1.02]",
                    isCurrentPlan && !plan.popular && "ring-2 ring-primary"
                  )}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Mais escolhido
                      </div>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <div className={cn(
                      "mx-auto w-14 h-14 rounded-full grid place-items-center mb-3",
                      plan.id === 'vip' ? "bg-warning/15" :
                      plan.id === 'pro' ? "bg-primary/15" : "bg-muted"
                    )}>
                      <PlanIcon className={cn(
                        "h-7 w-7",
                        plan.id === 'vip' ? "text-warning" :
                        plan.id === 'pro' ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    
                    {/* Pricing */}
                    <div className="pt-4 pb-2">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="font-mono text-4xl font-bold tabular-nums tracking-tight">{getDisplayPrice(plan)}</span>
                        {plan.monthlyPrice > 0 && <span className="text-muted-foreground">/mês</span>}
                      </div>

                      {/* Total price for semiannual/annual */}
                      {totalPrice && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: <span className="font-mono tabular-nums">{totalPrice}</span>
                        </p>
                      )}

                      {/* Equivalent monthly note */}
                      {equivalentNote && (
                        <p className="text-sm text-success font-mono font-medium tabular-nums mt-1">
                          {equivalentNote}
                        </p>
                      )}

                      {/* Plan-specific note */}
                      {plan.note && (
                        <p className={cn(
                          "text-sm mt-2 font-medium",
                          plan.popular ? "text-primary" : "text-muted-foreground"
                        )}>
                          {plan.note}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Features list */}
                    <ul className="space-y-2.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <div className="space-y-2">
                      <Button
                        className={cn(
                          "w-full font-semibold",
                          plan.popular && !isCurrentPlan && "shadow-md"
                        )}
                        variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "secondary"} 
                        disabled={isPlanCtaDisabled(plan)}
                        size="lg"
                        onClick={() => handlePlanCta(plan)}
                      >
                        {plan.monthlyPrice > 0 && !isPlanCtaDisabled(plan) && (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        {getPlanCtaLabel(plan)}
                      </Button>
                      {plan.monthlyPrice > 0 && !isPlanCtaDisabled(plan) && (
                        <p className="text-xs text-center text-muted-foreground leading-relaxed">
                          Pagamento processado pela Asaas: Pix, cartão ou boleto.
                        </p>
                      )}
                      {/* Plan 02-04 (W1c) — D-19 guarantee + HIGH-02 Pix/boleto delay */}
                      {plan.monthlyPrice > 0 && (
                        <div className="pt-3 mt-3 border-t border-border/50 space-y-1.5 text-center">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <Link to="/termos#garantia" className="underline hover:text-foreground">
                              Garantia de 7 dias
                            </Link>{' '}
                            após a primeira cobrança.
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Pix: confirma em até 4h · Boleto: até 2 dias úteis.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Features Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Comparação detalhada</CardTitle>
            <CardDescription>Veja todas as funcionalidades de cada plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Funcionalidade</th>
                    <th className="text-center py-4 px-4 min-w-[100px]">
                      <Star className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <span className="text-sm block font-medium">Free</span>
                    </th>
                    <th className="text-center py-4 px-4 min-w-[100px] bg-primary/5">
                      <Zap className="h-5 w-5 mx-auto text-primary mb-1" />
                      <span className="text-sm block text-primary font-bold">Pro</span>
                    </th>
                    <th className="text-center py-4 px-4 min-w-[100px]">
                      <Users className="h-5 w-5 mx-auto text-warning mb-1" />
                      <span className="text-sm block font-medium">VIP</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-4 text-sm">{f.name}</td>
                      <td className="py-3 px-4 text-center">{renderValue(f.free)}</td>
                      <td className="py-3 px-4 text-center bg-primary/5">{renderValue(f.pro)}</td>
                      <td className="py-3 px-4 text-center">{renderValue(f.vip)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Perguntas frequentes</CardTitle>
            <CardDescription>Tire suas dúvidas sobre os planos</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium hover:text-primary">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Support CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-warning/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div>
                <h3 className="font-semibold text-lg">Precisa de ajuda para escolher?</h3>
                <p className="text-muted-foreground text-sm">
                  Nossa equipe está pronta para ajudar você a encontrar o plano ideal
                </p>
              </div>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                asChild
              >
                {/* P2 — deadlink fix: dispara o widget do Crisp se disponível
                    (gated por marketing consent em CrispWidget), com fallback
                    pra e-mail se o widget não carregou (consent não dado). */}
                <a
                  href="mailto:suporte@milespro.net.br?subject=Ajuda%20para%20escolher%20plano"
                  onClick={(e) => {
                    const w = window as unknown as { $crisp?: unknown[] };
                    if (Array.isArray(w.$crisp)) {
                      e.preventDefault();
                      w.$crisp.push(['do', 'chat:open']);
                    }
                  }}
                >
                  Falar com suporte
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
