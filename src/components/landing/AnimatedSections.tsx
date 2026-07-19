import { lazy, Suspense, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calculator, Monitor, Crown, Check, Star, Zap, Quote, ArrowRight, X, Shield, Lock, Smartphone, Users, ChevronLeft, ChevronRight, Clock, Heart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { createSubscriptionLead, saveSubscriptionIntentLocally, SubscriptionLeadPlan } from '@/lib/subscriptionLeads';
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import economyReportPreview from '@/assets/landing/economy-report-preview.png';
import simulatorPreview from '@/assets/landing/simulator-preview.webp';
import mobilePreview from '@/assets/landing/mobile-preview.webp';
import vipLoungePreview from '@/assets/landing/vip-lounge-preview.webp';

// P2 — Module-scope IS_MOBILE was evaluated ONCE at script load, so a user
// rotating their device or resizing the window kept the stale value forever.
// Module-level matchMedia also evaluates differently between the server-side
// render (typeof window === 'undefined') and the client hydrate, which could
// in theory cause a hydration mismatch — moot today because this is a Vite
// SPA, but the hook form is correct regardless. Threshold kept at 639px (sm:
// breakpoint in Tailwind) to preserve the existing layout behaviour.
function useIsLandingMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined'
      && window.matchMedia('(max-width: 639px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    const handle = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);
  return isMobile;
}

// Hook for intersection observer based fade-in
const useFadeInOnScroll = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// Simple fade-in section component - optimized for mobile
const FadeInSection = ({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const { ref, isVisible } = useFadeInOnScroll();
  const isMobile = useIsLandingMobile();

  // On mobile, render immediately without animation overhead
  if (isMobile) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div 
      ref={ref}
      className={`transition-all duration-500 ease-out ${className} ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Dashboard Preview Section - Visual Cards
export const DashboardPreviewSection = () => {
  return (
    <section className="py-16 md:py-20 px-4 bg-muted/30 overflow-hidden">
      <div className="container mx-auto text-center">
        <FadeInSection>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Veja Sua Economia em Tempo Real
          </h2>
          <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
            Todas as suas milhas, economia e alertas num só lugar
          </p>
        </FadeInSection>
        
        {/* Visual Feature Cards */}
        <FadeInSection delay={200}>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mb-8">
            {/* Card 1 - Suas Milhas */}
            <Card className="p-6 text-left border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1">Suas Milhas</h3>
              <p className="text-3xl font-bold text-foreground mb-2">212.506</p>
              <p className="text-sm text-muted-foreground mb-3">em 3 programas</p>
              {/* Mini logos */}
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">L</span>
                </div>
                <div className="w-8 h-8 bg-primary dark:bg-primary/30 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary dark:text-primary">S</span>
                </div>
                <div className="w-8 h-8 bg-info dark:bg-info/30 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-info dark:text-info">TA</span>
                </div>
              </div>
            </Card>

            {/* Card 2 - Economia Acumulada */}
            <Card className="p-6 text-left border-border hover:shadow-lg transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                    <polyline points="16 7 22 7 22 13"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Economia Acumulada</h3>
                <p className="text-3xl font-bold text-success mb-2">R$ 12.450</p>
                <p className="text-sm text-muted-foreground">em 8 viagens este ano</p>
              </div>
            </Card>

            {/* Card 3 - Próximo Alerta */}
            <Card className="p-6 text-left border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1">Próximo Alerta</h3>
              <p className="text-lg font-bold text-foreground mb-1">15.000 milhas Smiles</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning dark:bg-warning/30 text-warning dark:text-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  Vencem em 23 dias
                </span>
              </div>
            </Card>
          </div>
        </FadeInSection>

        {/* Bottom text */}
        <FadeInSection delay={300}>
          <p className="text-muted-foreground text-sm md:text-base">
            Dashboard completo com saldos, alertas, simulador e relatórios, <span className="font-medium text-foreground">tudo num só lugar</span>
          </p>
        </FadeInSection>
      </div>
    </section>
  );
};

// Feature Previews Section
export const FeaturePreviewsSection = () => {
  const navigate = useNavigate();
  
  return (
    <section id="how-it-works" className="py-16 md:py-20 px-4 overflow-hidden">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            De Milhas Perdidas a Viagens Incríveis em 3 Passos
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conecte seus programas, calcule a economia e viaje pagando até 60% menos
          </p>
        </FadeInSection>
        
        {/* Simulator Preview */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto items-center mb-12 md:mb-16">
          <FadeInSection>
            <OptimizedImage
              src={simulatorPreview}
              alt="Simulador de ROI do MilesPro"
              aspectRatio="16/9"
              className="rounded-xl md:rounded-2xl shadow-lg md:shadow-xl w-full border border-border"
            />
          </FadeInSection>
          <FadeInSection delay={150} className="text-left">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Calculator className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">1. Conecte Seus Programas</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
              Cadastre Livelo, Smiles, Azul Fidelidade, Marriott, Hilton e +70 programas.
              Visualize todos os saldos em um único dashboard.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              {['Todos os programas aéreos e hotéis', 'Saldos atualizados em tempo real', 'Alertas de pontos vencendo'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeInSection>
        </div>

        {/* Mobile Preview */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto items-center mb-12 md:mb-16">
          <FadeInSection delay={100} className="text-left order-2 lg:order-1">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-4">
              <Monitor className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">2. Calcule Sua Economia</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
              Nosso simulador mostra exatamente quanto você economiza usando milhas 
              em vez de pagar em dinheiro. Passagens, hotéis, cruzeiros e mais.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              {['Comparativo milhas vs dinheiro', 'Economia estimada por viagem', 'Melhor momento para usar pontos'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeInSection>
          <FadeInSection className="order-1 lg:order-2 flex justify-center">
            <OptimizedImage 
              src={mobilePreview} 
              alt="MilesPro no celular" 
              className="rounded-xl md:rounded-2xl shadow-lg md:shadow-xl w-full max-w-[220px] sm:max-w-[280px] md:max-w-[300px] border border-border mx-auto"
            />
          </FadeInSection>
        </div>

        {/* VIP Lounge Spotlight - centered stack (breaks the repeating left/right split above) */}
        <div className="max-w-3xl mx-auto text-center">
          <FadeInSection>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 mx-auto">
              <Crown className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">3. Viaje Mais, Pague Menos</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-xl mx-auto">
              Reserve passagens, hotéis, cruzeiros e passeios com economia real. Acompanhe cada viagem e veja quanto você economizou ao longo do tempo.
            </p>
          </FadeInSection>
          <FadeInSection delay={100}>
            <div className="rounded-xl md:rounded-2xl overflow-hidden shadow-lg md:shadow-xl border border-border mb-6 md:mb-8">
              <OptimizedImage
                src={vipLoungePreview}
                alt="Controle de Sala VIP do MilesPro"
                aspectRatio="16/9"
                className="w-full"
              />
            </div>
          </FadeInSection>
          <FadeInSection delay={150}>
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              {['Histórico de economia por viagem', 'Relatórios de valor economizado', 'Controle de Sala VIP incluso'].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
        
        {/* Intermediate CTA */}
        <FadeInSection className="text-center mt-12">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')} 
            className="gap-2 hover:scale-105 transition-transform"
          >
            Calcular Minha Economia
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-sm text-muted-foreground mt-2">Conta grátis • Sem cartão de crédito</p>
        </FadeInSection>
      </div>
    </section>
  );
};

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

// All Features Grid Section
export const AllFeaturesSection = ({ features }: { features: Feature[] }) => {
  return (
    <section className="py-16 md:py-20 px-4 bg-muted/20">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Funcionalidades Que Fazem a Diferença
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para nunca mais perder milhas e sempre viajar pelo melhor preço
          </p>
        </FadeInSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <FadeInSection key={feature.title} delay={index * 50}>
              <Card className="border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 h-full group hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
};

// Programs Banner Section
export const ProgramsBannerSection = () => {
  const programs = ['Livelo', 'Esfera', 'Smiles', 'Azul Fidelidade', 'LatamPass', 'TAP', '+65 programas'];
  
  return (
    <section className="py-12 px-4 bg-muted/50 overflow-hidden">
      <div className="container mx-auto text-center">
        <p className="text-muted-foreground mb-4">Compatível com os principais programas de fidelidade</p>
        <div className="flex flex-wrap justify-center items-center gap-6 text-muted-foreground/70 font-medium">
          {programs.map((program, i) => (
            <span 
              key={program}
              className="hover:text-primary transition-colors cursor-default"
            >
              {program}
              {i < programs.length - 1 && <span className="ml-6">•</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  userLimit?: string;
  monthlyPrice?: string;
  semiannualPrice?: string;
  semiannualMonthly?: string;
  annualPrice?: string;
  annualMonthly?: string;
  priceNote?: string;
  ctaNote?: string;
}

// Pricing Section
export const PricingSection = ({
  plans,
  billingPeriod,
  setBillingPeriod
}: {
  plans: PricingPlan[];
  billingPeriod: 'monthly' | 'semiannual' | 'annual';
  setBillingPeriod: (period: 'monthly' | 'semiannual' | 'annual') => void;
}) => {
  const navigate = useNavigate();
  // Plan 02-06 (D-10 / CRIT-03) — iOS Path C: defense-in-depth (caller in
  // Index.tsx already skips this section on iOS; we double-gate here so a
  // misroute or import-by-mistake by another caller still won't render
  // pricing on the iOS build).
  const isIOS = useIsIOSCapacitor();
  if (isIOS) return null;

  // Track billing period changes
  const handleBillingChange = (period: 'monthly' | 'semiannual' | 'annual') => {
    setBillingPeriod(period);
    // Track in GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_billing_period', {
        billing_period: period,
        event_category: 'pricing',
      });
    }
  };

  // Plan 02-06 (PAY-04 / D-11) — landing CTA invokes create-checkout-session
  // (W2a) when the visitor is authenticated; otherwise falls through to the
  // existing /auth?plan=... bootstrap. subscription_leads remains as the
  // shadow log on Asaas failure (D-11). The W1b telemetry chokepoint cannot
  // be called from this anonymous landing surface because useTelemetry is
  // not stable in non-Suspense components yet; instead we keep the gtag
  // begin_checkout event and rely on PostHog auto-capture on /assinatura
  // post-auth.
  const handlePlanClick = async (planName: string) => {
    // Plan 02 canonical 3-tier mapping (D-01): VIP = top tier (formerly the legacy
    // top-tier card), Pro = mid tier (formerly the legacy mid-tier card). Detection
    // order matters: vip first (so 'VIP' card takes priority), then pro.
    const lower = planName.toLowerCase();
    const normalizedPlan: SubscriptionLeadPlan = lower.includes('vip')
      ? 'vip'
      : lower.includes('pro')
        ? 'pro'
        : 'free';

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        plan_selected: normalizedPlan,
        billing_period: billingPeriod,
        event_category: 'conversion',
      });
    }

    // Free plan: just send to signup.
    if (normalizedPlan === 'free') {
      saveSubscriptionIntentLocally({
        leadId: null,
        plan: 'free',
        billingPeriod,
        source: 'landing_pricing',
      });
      navigate(`/auth?plan=free&billing=${billingPeriod}`);
      return;
    }

    // Pro / VIP: try the authenticated checkout path. If there's no
    // session yet, fall through to /auth with plan params so the post-auth
    // landing can resume.
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;

    if (sessionUser) {
      // Authenticated visitor — same path as /assinatura's handlePlanCta.
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: normalizedPlan, cycle: billingPeriod },
      });
      const checkoutUrl =
        typeof data === 'object' && data !== null && 'checkoutUrl' in data
          ? String((data as { checkoutUrl?: unknown }).checkoutUrl ?? '')
          : '';

      if (!error && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      // Shadow log to subscription_leads (D-11 asaas_failure).
      logger.warn('[Landing pricing] create-checkout-session failed', error?.message ?? 'no checkoutUrl');
      try {
        await createSubscriptionLead({
          plan: normalizedPlan,
          billingPeriod,
          source: 'landing_pricing',
          email: sessionUser.email || null,
          userId: sessionUser.id,
          metadata: {
            sourcePath: window.location.pathname,
            planName,
            asaasError: error?.message ?? 'no_checkout_url',
            via: 'create-checkout-session',
            failureKind: 'asaas_failure',
          },
        });
      } catch (leadErr) {
        logger.warn('[Landing pricing] subscription_leads fallback failed', String(leadErr));
      }
      // Fall through to /assinatura so the user retries inside the app.
      navigate('/assinatura');
      return;
    }

    // Anonymous: keep the legacy lead capture + /auth pipeline.
    const lead = await createSubscriptionLead({
      plan: normalizedPlan,
      billingPeriod,
      source: 'landing_pricing',
      metadata: {
        sourcePath: window.location.pathname,
        planName,
      },
    });

    saveSubscriptionIntentLocally({
      leadId: lead.id,
      plan: normalizedPlan,
      billingPeriod,
      source: 'landing_pricing',
    });

    navigate(`/auth?plan=${normalizedPlan}&billing=${billingPeriod}`);
  };
  
  return (
    <section className="py-16 md:py-20 px-4" id="pricing">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Comece a Economizar nas Suas Viagens
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-2">
            A economia de UMA viagem já paga o ano inteiro do MilesPro
          </p>
          <p className="text-sm text-success font-medium">
            Comece grátis. Faça upgrade quando o MilesPro já estiver pagando a própria assinatura.
          </p>
          
          {/* Billing Toggle - 3 options */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => handleBillingChange('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border hover:bg-muted/50'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => handleBillingChange('semiannual')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'semiannual'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border hover:bg-muted/50'
              }`}
            >
              Semestral
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                billingPeriod === 'semiannual'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-success/20 text-success'
              }`}>
                -10%
              </span>
            </button>
            <button
              onClick={() => handleBillingChange('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border hover:bg-muted/50'
              }`}
            >
              Anual
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                billingPeriod === 'annual'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-success/20 text-success'
              }`}>
                -20%
              </span>
            </button>
          </div>
        </FadeInSection>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <FadeInSection key={plan.name} delay={index * 100}>
              <Card className={`relative h-full flex flex-col border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-primary border-2 shadow-lg scale-[1.02] bg-gradient-to-b from-primary/5 to-background' 
                  : ''
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-4 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Mais escolhido
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    {billingPeriod === 'monthly' && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{plan.monthlyPrice || plan.price}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                    )}
                    {billingPeriod === 'semiannual' && (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-foreground">{plan.semiannualPrice || plan.price}</span>
                          <span className="text-muted-foreground">/semestre</span>
                        </div>
                        {plan.semiannualMonthly && (
                          <p className="text-sm text-success mt-1">
                            equivale a {plan.semiannualMonthly}/mês
                          </p>
                        )}
                      </div>
                    )}
                    {billingPeriod === 'annual' && (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-foreground">{plan.annualPrice || plan.price}</span>
                          <span className="text-muted-foreground">/ano</span>
                        </div>
                        {plan.annualMonthly && (
                          <p className="text-sm text-success mt-1">
                            equivale a {plan.annualMonthly}/mês
                          </p>
                        )}
                      </div>
                    )}
                    {plan.priceNote && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {plan.priceNote}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full hover:scale-[1.02] transition-transform"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handlePlanClick(plan.name)}
                  >
                    {plan.cta}
                  </Button>
                  {plan.ctaNote && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {plan.ctaNote}
                    </p>
                  )}
                  {/* Plan 02-04 (W1c) — D-19 guarantee + HIGH-02 Pix/boleto delay messaging */}
                  {plan.monthlyPrice !== 'R$ 0' && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5">
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
                </CardContent>
              </Card>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
};

interface ComparisonFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  vip: string | boolean;
}

// Comparison Table Section
export const ComparisonTableSection = ({ features }: { features: ComparisonFeature[] }) => {
  const navigate = useNavigate();
  
  const renderComparisonValue = (value: string | boolean) => {
    if (typeof value === 'string') {
      return <span className="font-medium text-foreground">{value}</span>;
    }
    if (value === true) {
      return <Check className="w-5 h-5 text-success mx-auto" />;
    }
    return <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />;
  };
  
  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comparação Detalhada
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Veja todas as funcionalidades disponíveis em cada plano
          </p>
        </FadeInSection>
        <FadeInSection delay={200}>
          <Card className="max-w-5xl mx-auto overflow-hidden border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40%] font-semibold text-foreground">
                      Funcionalidade
                    </TableHead>
                    <TableHead className="text-center w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        <Star className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">Free</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[20%] bg-primary/5 border-x border-primary/20">
                      <div className="flex flex-col items-center gap-1">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-primary">Pro</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[20%]">
                      <div className="flex flex-col items-center gap-1">
                        <Users className="w-5 h-5 text-violet-500" />
                        <span className="font-semibold text-foreground">VIP</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature, index) => (
                    <TableRow 
                      key={feature.name}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      <TableCell className="font-medium text-foreground">
                        {feature.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderComparisonValue(feature.free)}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5 border-x border-primary/10">
                        {renderComparisonValue(feature.pro)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderComparisonValue(feature.vip)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-6 bg-muted/30 border-t border-border">
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/auth')} className="hover:scale-[1.02] transition-transform">
                  Começar Grátis
                </Button>
                <Button onClick={() => navigate('/auth')} className="hover:scale-[1.02] transition-transform">
                  Assinar VIP <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </FadeInSection>
      </div>
    </section>
  );
};

interface Testimonial {
  name: string;
  role: string;
  savings: string;
  avatar: string;
  image?: string;
  content: string;
}

// Star Rating Component
const StarRating = () => (
  <div className="flex gap-0.5 mb-3">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
    ))}
  </div>
);

// Testimonials Section with Carousel
export const TestimonialsSection = ({ testimonials }: { testimonials: Testimonial[] }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Calculate max index based on visible cards (3 on desktop, 1 on mobile)
  const getVisibleCards = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? 3 : 1;
    }
    return 3;
  };
  
  const [visibleCards, setVisibleCards] = useState(getVisibleCards());
  
  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const maxIndex = Math.max(0, testimonials.length - visibleCards);
  
  const nextSlide = () => {
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };
  
  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };
  
  return (
    <section className="py-16 md:py-20 px-4 bg-muted/30 overflow-hidden">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Viajantes Que Economizaram de Verdade
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Histórias reais de economia em passagens, hotéis e passeios
          </p>
        </FadeInSection>
        
        {/* Carousel Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <button
            onClick={nextSlide}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          
          {/* Cards Container */}
          <div className="overflow-hidden px-2">
            <div 
              className="flex transition-transform duration-300 ease-in-out gap-4 md:gap-6"
              style={{ 
                transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
              }}
            >
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.name} 
                  className="flex-shrink-0 w-full md:w-[calc(33.333%-1rem)]"
                >
                  <Card className="border-border h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                    <CardContent className="pt-6 p-5 md:pt-6 md:p-6">
                      <StarRating />
                      <Quote className="w-6 h-6 text-primary/30 mb-3 group-hover:text-primary/50 transition-colors" />
                      <p className="text-muted-foreground mb-4 text-base md:text-sm leading-relaxed line-clamp-4">
                        "{testimonial.content}"
                      </p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 md:w-10 md:h-10">
                          {testimonial.image && (
                            <AvatarImage src={testimonial.image} alt={testimonial.name} className="object-cover" />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-base md:text-sm">
                            {testimonial.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground text-base md:text-sm">{testimonial.name}</p>
                          <p className="text-sm md:text-xs text-muted-foreground">{testimonial.role}</p>
                          <p className="text-xs font-semibold text-primary">{testimonial.savings}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Intermediate CTA after testimonials */}
        <FadeInSection className="text-center mt-10">
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="gap-2 hover:scale-105 transition-transform"
          >
            Criar Conta Grátis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </FadeInSection>
      </div>
    </section>
  );
};

interface FAQItem {
  question: string;
  answer: string;
}

// FAQ Section
export const FAQSection = ({ items }: { items: FAQItem[] }) => {
  return (
    <section className="py-20 px-4" id="faq">
      <div className="container mx-auto">
        <FadeInSection className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tire suas dúvidas sobre o MilesPro
          </p>
        </FadeInSection>
        <FadeInSection delay={200} className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary transition-colors">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeInSection>
      </div>
    </section>
  );
};

// Stats Section
export const StatsSection = () => {
  const stats = [
    { value: '+500', label: 'Usuários ativos' },
    { value: '+10M', label: 'Milhas gerenciadas' },
    { value: '+20', label: 'Programas suportados' },
  ];
  
  return (
    <section className="py-16 px-4 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="container mx-auto relative">
        <div className="grid sm:grid-cols-3 gap-8 text-center max-w-3xl mx-auto">
          {stats.map((stat, index) => (
            <FadeInSection key={stat.label} delay={index * 100}>
              <div className="hover:scale-105 transition-transform">
                <p className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</p>
                <p className="text-primary-foreground/80">{stat.label}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
export const CTASection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 md:py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      <div className="container mx-auto text-center max-w-2xl relative">
        <FadeInSection>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Sua Próxima Viagem Pode Custar 60% Menos
          </h2>
          <p className="text-muted-foreground mb-6">
            Organize seus pontos, evite vencimentos e descubra quando vale a pena trocar milhas por passagens.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="gap-2 shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
          >
            Criar Conta Grátis
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div className="text-sm text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-success shrink-0" />
              Usuários economizam em média R$ 3.000 por viagem
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-success shrink-0" />
              Sem cartão de crédito
            </span>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
};

// Footer Section
export const FooterSection = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Column 1 - Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-bold text-white">MilesPro</span>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              A plataforma brasileira de gestão de milhas e pontos para viajantes inteligentes.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a 
                href="https://instagram.com/milespro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-800 hover:bg-primary rounded-full flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="https://twitter.com/milespro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-800 hover:bg-primary rounded-full flex items-center justify-center transition-colors"
                aria-label="Twitter/X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://linkedin.com/company/milespro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-slate-800 hover:bg-primary rounded-full flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 - Produto */}
          <div>
            <h4 className="text-white font-semibold mb-4">Produto</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Funcionalidades
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('pricing')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Preços
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Programas Suportados
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('faq')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 - Empresa */}
          <div>
            <h4 className="text-white font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/sobre" className="text-slate-400 hover:text-white transition-colors">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="/blog" className="text-slate-400 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="mailto:suporte@milespro.net.br" className="text-slate-400 hover:text-white transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 - Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/termos" className="text-slate-400 hover:text-white transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="/privacidade" className="text-slate-400 hover:text-white transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="/privacidade#lgpd" className="text-slate-400 hover:text-white transition-colors">
                  LGPD
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Badges */}
        <div className="border-t border-slate-800 pt-8 mb-8">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-white font-medium text-xs">Dados Criptografados</p>
                <p className="text-slate-500 text-xs">SSL 256-bit</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-white font-medium text-xs">Pagamento Seguro</p>
                <p className="text-slate-500 text-xs">Asaas Integrado</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-white font-medium text-xs">LGPD Compliant</p>
                <p className="text-slate-500 text-xs">Proteção de Dados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} MilesPro. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1.5">Feito com <Heart className="w-3.5 h-3.5 fill-current text-primary" /> no Brasil para viajantes inteligentes</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Inline Signup Section - Reduce friction
export const InlineSignupSection = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track inline form submission in GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        method: 'inline_form',
        event_category: 'conversion',
      });
    }
    
    if (email) {
      localStorage.setItem('signup_email', email);
    }
    if (name) {
      localStorage.setItem('signup_name', name);
    }
    navigate('/auth?mode=signup');
  };
  
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-xl text-center">
        <FadeInSection>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Pronto Para Economizar?
          </h2>
          <p className="text-muted-foreground mb-6">
            Crie sua conta grátis, sem cartão de crédito
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              placeholder="Seu nome" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
            />
            <Input 
              type="email" 
              placeholder="Seu melhor email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background"
            />
            <Button type="submit" size="lg" className="w-full hover:scale-[1.02] transition-transform">
              Criar Conta Grátis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">
            Ao criar sua conta, você concorda com nossos termos de uso
          </p>
        </FadeInSection>
      </div>
    </section>
  );
};

// Guarantee Section
export const GuaranteeSection = () => {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <FadeInSection>
          <Card className="text-center p-8 border-success/30 bg-success/5">
            <Shield className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Satisfação Garantida</h3>
            <p className="text-muted-foreground mb-4">
              Comece no plano gratuito e faça upgrade quando quiser. Se assinar e não fizer sentido para sua rotina, cancele sem multa ou burocracia.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-success" />
                Dados criptografados
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                Sem cartão de crédito
              </span>
            </div>
          </Card>
        </FadeInSection>
      </div>
    </section>
  );
};

// Competitor Comparison Section
export const CompetitorComparisonSection = () => {
  const navigate = useNavigate();
  
  const comparisonData = [
    { feature: 'Preço mensal', milespro: 'R$ 37,90', others: '"Grátis" (mas quanto você perde sem gestão?)' },
    { feature: 'Setup inicial', milespro: '2 minutos', others: 'Horas para montar' },
    { feature: 'Alertas de vencimento', milespro: true, milesproText: 'Automático', others: false, othersText: 'Manual' },
    { feature: 'Simulador milhas vs dinheiro', milespro: true, milesproText: '8 tipos', others: false },
    { feature: 'Controle de Sala VIP', milespro: true, milesproText: 'Por cartão', others: false },
    { feature: 'App Mobile', milespro: true, milesproText: 'PWA', others: false, othersText: 'Difícil no celular' },
    { feature: '70+ programas integrados', milespro: true, others: 'Atualizar manualmente' },
    { feature: 'Relatório para IR', milespro: true, milesproText: 'Automático', others: false, othersText: 'Manual' },
    { feature: 'Gestão familiar', milespro: true, milesproText: 'Até 5 pessoas', others: 'Cada um na sua planilha' },
    { feature: 'Atualização de cotações', milespro: true, milesproText: 'Tempo real', others: false, othersText: 'Desatualizado' },
  ];
  
  const renderMilesProValue = (row: typeof comparisonData[0]) => {
    if (row.milespro === true) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Check className="w-6 h-6 text-success flex-shrink-0" strokeWidth={3} />
          {row.milesproText && <span className="font-medium text-foreground text-sm">{row.milesproText}</span>}
        </div>
      );
    }
    return <span className="font-semibold text-foreground">{row.milespro}</span>;
  };
  
  const renderOthersValue = (row: typeof comparisonData[0]) => {
    if (row.others === false) {
      return (
        <div className="flex items-center justify-center gap-2">
          <X className="w-5 h-5 text-destructive/60 flex-shrink-0" />
          {row.othersText && <span className="text-muted-foreground text-sm">{row.othersText}</span>}
        </div>
      );
    }
    if (row.others === true) {
      return <Check className="w-5 h-5 text-success mx-auto" />;
    }
    return <span className="text-muted-foreground text-sm">{row.others}</span>;
  };
  
  return (
    <section className="py-16 px-4 bg-muted/20">
      <div className="container mx-auto max-w-4xl">
        <FadeInSection className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Por Que Escolher o MilesPro?
          </h2>
          <p className="text-muted-foreground">
            Compare e veja por que somos a melhor escolha para gestão de milhas
          </p>
        </FadeInSection>
        
        <FadeInSection delay={200}>
          <Card className="overflow-hidden border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40%] font-semibold text-foreground">
                    Recurso
                  </TableHead>
                  <TableHead className="text-center w-[30%] bg-primary/10 border-x border-primary/20">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold text-primary text-base">MilesPro</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-[30%]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-muted-foreground">Planilhas / Excel</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((row, index) => (
                  <TableRow 
                    key={row.feature}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                  >
                    <TableCell className="font-medium text-foreground py-4">
                      {row.feature}
                    </TableCell>
                    <TableCell className="text-center bg-primary/5 border-x border-primary/10 py-4">
                      {renderMilesProValue(row)}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {renderOthersValue(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Time savings note */}
            <div className="p-4 bg-warning dark:bg-warning/30 border-t border-warning dark:border-warning">
              <p className="text-center text-sm text-warning dark:text-warning">
                <Clock className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                <span className="font-medium">Usuários gastam em média 4 horas/mês</span> gerenciando milhas em planilhas. 
                <span className="font-semibold"> O MilesPro faz isso em 5 minutos.</span>
              </p>
            </div>
            
            <div className="p-6 bg-muted/30 border-t border-border text-center">
              <Button onClick={() => navigate('/auth')} size="lg" className="hover:scale-[1.02] transition-transform">
                Criar Conta Grátis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </FadeInSection>
      </div>
    </section>
  );
};
