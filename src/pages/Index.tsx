import { useAuth } from '@/hooks/useAuth';
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import {
  Plane, Loader2,
  Target, LayoutDashboard,
  Ship, Clock, BarChart3, Users, FileText, RefreshCw, Calculator,
  Check
} from 'lucide-react';
import { useEffect, lazy, Suspense } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Category images - generated via AI
import categoryFlightsImg from '@/assets/landing/category-flights.jpg';
import categoryHotelsImg from '@/assets/landing/category-hotels.jpg';
import categoryCruisesImg from '@/assets/landing/category-cruises.jpg';
import categoryControlImg from '@/assets/landing/category-control.jpg';

// New conversion-focused components - these are above the fold, import directly
import { PainPointsSection } from '@/components/landing/PainPointsSection';
import { TrustMetricsSection } from '@/components/landing/TrustMetricsSection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { SavingsShowcase } from '@/components/landing/SavingsShowcase';
import { CategoryCard } from '@/components/landing/CategoryCard';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProgramsLogoBar } from '@/components/landing/ProgramsLogoBar';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PromoTopBanner } from '@/components/landing/PromoTopBanner';

// Lazy load below-the-fold sections to reduce initial bundle and improve TTI
const DashboardPreviewSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.DashboardPreviewSection })));
const FeaturePreviewsSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.FeaturePreviewsSection })));
const AllFeaturesSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.AllFeaturesSection })));
const ProgramsBannerSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.ProgramsBannerSection })));
const PricingSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.PricingSection })));
const TestimonialsSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.TestimonialsSection })));
const FAQSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.FAQSection })));
const CTASection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.CTASection })));
const FooterSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.FooterSection })));
const InlineSignupSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.InlineSignupSection })));
const GuaranteeSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.GuaranteeSection })));
const CompetitorComparisonSection = lazy(() => import('@/components/landing/AnimatedSections').then(m => ({ default: m.CompetitorComparisonSection })));

// Minimal loading placeholder for lazy sections
const SectionLoader = () => (
  <div className="py-16 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  // Plan 02-06 (D-10 / CRIT-03) — iOS Path C runtime gate. Used below to
  // hide the entire PricingSection on the iOS Capacitor build (the strings
  // | grep gate in Phase 3 verifies no pricing copy ships in the iOS bundle).
  const isIOS = useIsIOSCapacitor();
  // Plan 02-04 (W1c) — HIGH-06: annual cycle is the default highlight (savings forward).
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'semiannual' | 'annual'>('annual');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mainFeatures = [
    {
      icon: Plane,
      title: 'Passagens Aéreas',
      description: 'Economize até 75% em voos nacionais e internacionais usando suas milhas.',
      image: categoryFlightsImg,
    },
    {
      icon: Target,
      title: 'Hotéis de Luxo',
      description: 'Reserve hotéis 5 estrelas pagando uma fração do preço em dinheiro.',
      image: categoryHotelsImg,
    },
    {
      icon: Ship,
      title: 'Cruzeiros e Passeios',
      description: 'Transforme pontos em experiências incríveis: cruzeiros, tours e mais.',
      image: categoryCruisesImg,
    },
    {
      icon: LayoutDashboard,
      title: 'Controle Total',
      description: 'Calcule sua economia, evite vencimentos e maximize cada ponto.',
      image: categoryControlImg,
    },
  ];

  const platformFeatures = [
    { icon: LayoutDashboard, title: 'Dashboard Inteligente', description: 'Visualize saldos, vencimentos e economia de todos os programas num só lugar.' },
    { icon: Calculator, title: 'Simulador Milhas vs Dinheiro', description: 'Calcule em segundos se vale mais usar milhas ou pagar em dinheiro.' },
    { icon: Clock, title: 'Alertas de Vencimento', description: 'Receba avisos antes dos seus pontos expirarem. Nunca mais perca milhas.' },
    { icon: BarChart3, title: 'Relatórios de Economia', description: 'Acompanhe quanto economizou ao longo do tempo com gráficos detalhados.' },
    { icon: Plane, title: 'Controle de Sala VIP', description: 'Saiba exatamente quantos acessos VIP cada cartão ainda tem.' },
    { icon: Users, title: 'Gestão Familiar', description: 'Gerencie milhas de toda família com logins individuais e saldo consolidado.' },
    { icon: FileText, title: 'Relatório para IR', description: 'Exporte dados organizados para declaração de Imposto de Renda.' },
    { icon: RefreshCw, title: '70+ Programas', description: 'Livelo, Smiles, Azul Fidelidade, LatamPass, Marriott, Hilton e muito mais.' },
  ];

  const testimonials = [
    {
      name: 'Marcos R.',
      role: 'Profissional autônomo',
      savings: 'Economizou R$ 4.800',
      avatar: 'MR',
      image: undefined,
      content: 'Tinha 35.000 milhas Latam prestes a vencer. O MilesPro me alertou e consegui usar tudo numa passagem pra Buenos Aires. Valeu cada centavo da assinatura.',
    },
    {
      name: 'Fernanda L.',
      role: 'Gerente de projetos',
      savings: 'Economizou R$ 6.200',
      avatar: 'FL',
      image: undefined,
      content: 'Controlava tudo no Excel e perdia pontos toda semana. Agora com todos os programas integrados, minha família nunca mais deixou milhas vencerem.',
    },
    {
      name: 'Ricardo S.',
      role: 'Advogado',
      savings: 'Economizou R$ 9.100',
      avatar: 'RS',
      image: undefined,
      content: 'O simulador me mostrou que transferir pontos Esfera pro TudoAzul era melhor que usar direto. Economizei mais de R$ 9.000 num cruzeiro só com essa dica.',
    },
    {
      name: 'Patricia M.',
      role: 'Professora universitária',
      savings: 'Economizou R$ 3.400',
      avatar: 'PM',
      image: undefined,
      content: 'Viajo a trabalho todo mês. Com o controle de Sala VIP, nunca mais perdi acesso por não saber quantas cotas ainda tinha. Mudou minha experiência.',
    },
    {
      name: 'André T.',
      role: 'Desenvolvedor',
      savings: 'Economizou R$ 5.600',
      avatar: 'AT',
      image: undefined,
      content: 'A compra turbinada com bônus de 200% era o que eu precisava pra累積 milhas mais rápido. Hoje já tenho pontos pra duas viagens internacionais.',
    },
    {
      name: 'Juliana C.',
      role: 'Médica veterinária',
      savings: 'Economizou R$ 7.300',
      avatar: 'JC',
      image: undefined,
      content: 'Levei minha família completa pra Disney em classe executiva com milhas. O que seria R$ 45.000 em dinheiro custou só R$ 12.000 em pontos + taxas.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: 'R$ 0',
      period: '/mês',
      monthlyPrice: 'R$ 0',
      semiannualPrice: 'R$ 0',
      annualPrice: 'R$ 0',
      description: 'Ideal para quem está começando',
      priceNote: 'Sem compromisso — comece hoje',
      features: [
        'Cadastro de 1 programa de pontos',
        'Visão unificada dos seus saldos',
        'Alertas básicos de vencimento',
        'Simulador simples de valor do milheiro',
        'Dashboard básico por programa',
        'Histórico de 30 dias',
      ],
      cta: 'Começar Grátis Agora',
      ctaNote: 'Sem cartão de crédito',
      popular: false,
    },
    {
      name: 'Pro',
      price: 'R$ 37,90',
      period: '/mês',
      monthlyPrice: 'R$ 37,90',
      semiannualPrice: 'R$ 203,46',
      semiannualMonthly: 'R$ 33,91',
      annualPrice: 'R$ 363,84',
      annualMonthly: 'R$ 30,32',
      description: 'Para quem realmente usa milhas',
      priceNote: 'Uma emissão bem feita costuma pagar vários meses de assinatura',
      features: [
        'Integração com todos os programas (Livelo, Esfera, Smiles, TudoAzul, Latam Pass e outros)',
        'Atualização automática diária dos saldos',
        'Alertas completos de vencimento em todos os programas',
        'Simulador completo com histórico recente',
        'Recomendações: emitir, transferir ou vender milhas',
        'Histórico completo de movimentações',
        'Dashboard detalhado por programa e por banco',
        'Gestão de múltiplos cartões de crédito',
        'Controle de acesso à Sala VIP',
        'Suporte por e-mail em até 24h',
      ],
      cta: 'Garantir Minha Conta Pro',
      popular: true,
    },
    {
      name: 'VIP',
      price: 'R$ 67,90',
      period: '/mês',
      monthlyPrice: 'R$ 67,90',
      semiannualPrice: 'R$ 365,10',
      semiannualMonthly: 'R$ 60,85',
      annualPrice: 'R$ 652,32',
      annualMonthly: 'R$ 54,36',
      description: 'Gestão profissional de milhas',
      priceNote: 'R$ 13,58/pessoa para até 5 perfis',
      userLimit: 'Até 5 perfis',
      features: [
        'Tudo do Pro +',
        'Gestão de até 5 perfis (família ou clientes)',
        'Múltiplas contas por programa de pontos em cada perfil',
        'Atualizações mais frequentes de saldos',
        'Alertas avançados: vencimento + oportunidades de alto valor',
        'Cenários avançados no simulador (transferência bonificada, venda, emissão)',
        'Relatórios com exportação em CSV/Excel',
        'Dashboards focados em lucro com milhas',
        'Suporte prioritário via WhatsApp',
        'Gestão de milhas como negócio — não hobby',
      ],
      cta: 'Quero Ser VIP',
      popular: false,
    },
  ];

  const comparisonFeatures = [
    { name: 'Perfis/Usuários', free: '1', pro: '1', vip: '5' },
    { name: 'Programas suportados', free: '1', pro: 'Todos', vip: 'Todos' },
    { name: 'Operações/mês', free: '20', pro: 'Ilimitado', vip: 'Ilimitado' },
    { name: 'Histórico', free: '30 dias', pro: 'Ilimitado', vip: 'Ilimitado' },
    { name: 'Dashboard completo', free: true, pro: true, vip: true },
    { name: 'Alertas de vencimento', free: true, pro: true, vip: true },
    { name: 'Atualização automática de saldos', free: false, pro: true, vip: true },
    { name: 'Simulador completo com histórico', free: false, pro: true, vip: true },
    { name: 'Recomendações de uso (emitir/transferir/vender)', free: false, pro: true, vip: true },
    { name: 'Gestão de titulares (CPFs)', free: false, pro: true, vip: true },
    { name: 'Cadastro de cartões', free: false, pro: true, vip: true },
    { name: 'Controle de Sala VIP', free: false, pro: true, vip: true },
    { name: 'Compra Turbinada', free: false, pro: true, vip: true },
    { name: 'Bumerangue', free: false, pro: true, vip: true },
    { name: 'Clube Assinante', free: false, pro: true, vip: true },
    { name: 'Simuladores avançados (transferência, venda, emissão)', free: false, pro: false, vip: true },
    { name: 'Relatórios com exportação CSV/Excel', free: false, pro: false, vip: true },
    { name: 'Dashboards focados em lucro', free: false, pro: false, vip: true },
    { name: 'Suporte via WhatsApp prioritário', free: false, pro: false, vip: true },
  ];

  const faqItems = [
    // Objeções de compra (mais decisivas para conversão)
    {
      question: 'Quanto tempo leva para configurar?',
      answer: 'Menos de 2 minutos. Basta criar sua conta, cadastrar seus programas de fidelidade e o MilesPro já começa a calcular sua economia.',
    },
    {
      question: 'Vocês têm acesso às minhas milhas?',
      answer: 'Não. O MilesPro é uma ferramenta de gestão. Você insere seus saldos e operações — nós não acessamos suas contas nos programas de fidelidade.',
    },
    {
      question: 'Preciso pagar para começar?',
      answer: 'Não. Você pode criar uma conta gratuita, organizar seus primeiros programas e só fazer upgrade quando quiser histórico completo, alertas avançados, simuladores e gestão profissional.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Sim, sem multa e sem burocracia. Cancele direto pelo app em 2 cliques. Seus dados ficam disponíveis por 30 dias após o cancelamento.',
    },
    {
      question: 'Vocês oferecem garantia?',
      answer: 'Sim — 7 dias de garantia incondicional após a primeira cobrança. Não gostou nos primeiros 7 dias? Devolvemos integralmente, sem perguntas, sem burocracia. Veja os Termos de Uso para detalhes.',
    },
    // Plan 02-06 D-12 / TIER-04..06 — multi-CPF VIP positioning.
    {
      question: 'Posso gerenciar milhas de várias pessoas (família ou clientes)?',
      answer: 'Sim, no plano VIP. Você cria até 5 perfis adicionais por CPF (cada um com login próprio) e gerencia tudo no mesmo painel — saldos consolidados, simulador, alertas e relatórios separados por perfil. Ideal para famílias e quem trabalha com milhas como negócio. No plano Pro o gerenciamento é apenas do seu próprio CPF.',
    },
    {
      question: 'Quais formas de pagamento são aceitas?',
      answer: 'Aceitamos Pix, Cartão de Crédito (parcelado em planos semestrais/anuais) e Boleto bancário, processados pela Asaas. Pix tem confirmação em até 4 horas; Boleto, em até 2 dias úteis após o pagamento. Cartão é processado imediatamente.',
    },
    {
      question: 'Vale a pena para quem tem poucas milhas?',
      answer: 'Sim! Mesmo com 10.000 milhas, o simulador mostra se vale usar em uma passagem, hotel ou acumular mais. E os alertas de vencimento já valem o investimento.',
    },
    // Perguntas gerais sobre o produto
    {
      question: 'O que é o MilesPro?',
      answer: 'O MilesPro é uma plataforma completa para gestão de milhas e pontos. Registre operações de compra, venda, transferência e bumerangue, acompanhe custos por milheiro, visualize saldos por programa e receba alertas de vencimento.',
    },
    {
      question: 'Quais programas são suportados?',
      answer: 'Suportamos mais de 70 programas: Livelo, Esfera, Smiles, Azul Fidelidade, LatamPass, TAP Miles&Go, Ibéria, Átomos, além de 20+ companhias aéreas internacionais (American, United, Delta, Emirates, Qatar e mais), redes de hotéis (Accor, Marriott, Hilton, IHG, Hyatt), 20+ bancos e cartões, combustíveis e programas de varejo.',
    },
    {
      question: 'O sistema funciona no celular?',
      answer: 'Sim! O MilesPro é um PWA (Progressive Web App) que funciona perfeitamente em smartphones e tablets. Você pode instalar como um app no seu celular e acessar offline.',
    },
    {
      question: 'O que significa CM (Custo Médio)?',
      answer: 'CM é o Custo Médio por milheiro, calculado automaticamente com base em todas as suas operações de entrada. É fundamental para saber se está comprando caro ou barato em relação ao seu estoque.',
    },
    {
      question: 'O MilesPro ajuda no Imposto de Renda?',
      answer: 'Sim! Geramos relatórios de operações organizados por período, facilitando a declaração de ganhos com milhas no IR. Você tem acesso a todas as informações necessárias para prestar contas à Receita.',
    },
    {
      question: 'Meus dados estão seguros?',
      answer: 'Sim, utilizamos criptografia de ponta a ponta e servidores seguros. Não armazenamos senhas de programas. Cada usuário acessa apenas seus próprios dados com autenticação obrigatória.',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Promo Banner - Top absolute */}
      <PromoTopBanner />
      
      {/* Header - Sticky with scroll effect */}
      <LandingHeader />

      {/* Hero - High-Impact Conversion Optimized */}
      <HeroSection />
      
      {/* Programs Logo Bar - Social proof */}
      <ProgramsLogoBar />

      {/* Main Features Banner - Now with real images */}
      <section id="features" className="py-12 md:py-16 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Transforme Milhas em Experiências
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Veja como o MilesPro ajuda você a economizar em todas as suas viagens
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {mainFeatures.map((feature, index) => (
              <CategoryCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                image={feature.image}
                className="animate-fade-in-up"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points Section - Emotional Connection */}
      <PainPointsSection />
      
      {/* Savings Showcase - Visual Examples */}
      <SavingsShowcase />

      {/* Below-the-fold sections - Wrapped in Suspense for lazy loading */}
      <Suspense fallback={<SectionLoader />}>
        <DashboardPreviewSection />
      </Suspense>
      
      {/* Trust Metrics - Moved up for credibility */}
      <TrustMetricsSection />
      
      <Suspense fallback={<SectionLoader />}>
        <FeaturePreviewsSection />
      </Suspense>
      
      {/* Testimonials moved up before pricing */}
      <Suspense fallback={<SectionLoader />}>
        <TestimonialsSection testimonials={testimonials} />
      </Suspense>
      
      <Suspense fallback={<SectionLoader />}>
        <AllFeaturesSection features={platformFeatures} />
      </Suspense>
      
      <Suspense fallback={<SectionLoader />}>
        <ProgramsBannerSection />
      </Suspense>

      {/* Founder Offer - conversion bridge before pricing */}
      <section className="relative py-16 px-4 bg-card border-y border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_45%),radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.08),transparent_40%)]" aria-hidden />
        <div className="container mx-auto max-w-5xl relative">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2.5 mb-5">
                <span className="relative inline-block">
                  <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="absolute inset-0 rounded-full bg-primary blur-[5px] opacity-70" aria-hidden />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Oferta fundadora MilesPro
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Primeiro organize suas milhas. Depois decida se vale pagar.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                A conta grátis serve para você enxergar saldo, custo médio e oportunidades. O Pro entra quando você quer alertas completos, histórico ilimitado, simuladores e decisão com números — não com achismo.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 backdrop-blur-md p-6 shadow-2xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-2">Regra simples de compra</p>
              <p className="text-xl md:text-2xl font-bold text-foreground mb-5 leading-snug">
                Se o MilesPro evitar uma perda ou melhorar uma emissão, ele já se paga.
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Sem cartão para começar</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Plano grátis para validar valor</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Upgrade manual e consciente</li>
              </ul>
              <Button size="lg" onClick={() => navigate('/auth')} className="w-full font-semibold shadow-lg shadow-primary/25">
                Criar minha conta grátis
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Inline Signup - Reduce friction */}
      <Suspense fallback={<SectionLoader />}>
        <InlineSignupSection />
      </Suspense>
      
      {/* Plan 02-06 (D-10 / CRIT-03) — iOS Path C: hide the entire pricing
          section on iOS Capacitor. The Phase 3 `strings | grep` gate
          (G-CRIT-03) verifies no pricing strings ship in the iOS bundle;
          this conditional render is the canonical hide. */}
      {!isIOS && (
        <Suspense fallback={<SectionLoader />}>
          <PricingSection
            plans={pricingPlans}
            billingPeriod={billingPeriod}
            setBillingPeriod={setBillingPeriod}
          />
        </Suspense>
      )}
      
      {/* Competitor Comparison */}
      <Suspense fallback={<SectionLoader />}>
        <CompetitorComparisonSection />
      </Suspense>
      
      {/* Guarantee Section */}
      <Suspense fallback={<SectionLoader />}>
        <GuaranteeSection />
      </Suspense>
      
      {/* Expanded FAQ */}
      <Suspense fallback={<SectionLoader />}>
        <FAQSection items={faqItems} />
      </Suspense>
      
      <Suspense fallback={<SectionLoader />}>
        <CTASection />
        <FooterSection />
      </Suspense>
      
      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
