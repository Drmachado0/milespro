import { lazy, Suspense, ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ManagedAccountProvider } from "@/contexts/ManagedAccountContext";
import { LocalizationProvider } from "@/providers/LocalizationProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PlanProtectedRoute } from "@/components/PlanProtectedRoute";
import { TierRoute } from "@/components/TierRoute";
import { PageLoading } from "@/components/ui/page-loading";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { pageview } from "@/lib/posthog";
import { ConsentBanner } from "@/components/legal/ConsentBanner";
import { ConsentWatcher } from "@/components/legal/ConsentWatcher";
import { CrispWidget } from "@/components/layout/CrispWidget";

// Lazy load heavy providers only for authenticated routes
const ProtectedProviders = lazy(() => import("./components/ProtectedProviders").then(m => ({ default: m.ProtectedProviders })));

// Lazy load all pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LogosGallery = lazy(() => import("./pages/LogosGallery"));
const QaDesign = lazy(() => import("./pages/QaDesign"));
const QaMobile = lazy(() => import("./pages/QaMobile"));
const Analises = lazy(() => import("./pages/Analises"));
const Simulador = lazy(() => import("./pages/Simulador"));
const Titulares = lazy(() => import("./pages/Titulares"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Compra = lazy(() => import("./pages/operacoes/Compra"));
const Transferencia = lazy(() => import("./pages/operacoes/Transferencia"));
const Venda = lazy(() => import("./pages/operacoes/Venda"));
const PassagemEmitida = lazy(() => import("./pages/operacoes/PassagemEmitida"));
const SaidaManual = lazy(() => import("./pages/operacoes/SaidaManual"));
const EntradaManual = lazy(() => import("./pages/operacoes/EntradaManual"));
const Bumerangue = lazy(() => import("./pages/operacoes/Bumerangue"));
const CompraTurbinada = lazy(() => import("./pages/operacoes/CompraTurbinada"));
const CompraCarrinho = lazy(() => import("./pages/operacoes/CompraCarrinho"));
const TransferenciaCartao = lazy(() => import("./pages/operacoes/TransferenciaCartao"));
const VisaoGeral = lazy(() => import("./pages/operacoes/VisaoGeral"));
const Cartoes = lazy(() => import("./pages/gestao/Cartoes"));
const CartaoDetalhes = lazy(() => import("./pages/gestao/CartaoDetalhes"));
const PrecosProgramas = lazy(() => import("./pages/gestao/PrecosProgramas"));
const BonusPendentes = lazy(() => import("./pages/gestao/BonusPendentes"));
const ClubeAssinante = lazy(() => import("./pages/gestao/ClubeAssinante"));
const SalaVIP = lazy(() => import("./pages/gestao/SalaVIP"));
const CartoesRelatorio = lazy(() => import("./pages/relatorios/CartoesRelatorio"));
const PassagensEmitidasRelatorio = lazy(() => import("./pages/relatorios/PassagensEmitidas"));
const EconomiaRelatorio = lazy(() => import("./pages/relatorios/EconomiaRelatorio"));
const ProgramaDetalhado = lazy(() => import("./pages/ProgramaDetalhado"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Assinatura = lazy(() => import("./pages/Assinatura"));
const Promocoes = lazy(() => import("./pages/Promocoes"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Instalar = lazy(() => import("./pages/Instalar"));
const Conquistas = lazy(() => import("./pages/Conquistas"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/blog/[slug]"));
const BlogAdmin = lazy(() => import("./pages/BlogAdmin"));
const Termos = lazy(() => import("./pages/Termos"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const LgpdConfirmDelete = lazy(() => import("./pages/LgpdConfirmDelete"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));

// Travel Agency pages
const AgenciaDashboard = lazy(() => import("./pages/agencia/Dashboard"));
const AgenciaClientes = lazy(() => import("./pages/agencia/Clientes"));
const AgenciaPassagens = lazy(() => import("./pages/agencia/Passagens"));
const AgenciaHoteis = lazy(() => import("./pages/agencia/Hoteis"));
const AgenciaCarros = lazy(() => import("./pages/agencia/Carros"));
const AgenciaOrcamentos = lazy(() => import("./pages/agencia/Orcamentos"));
const AgenciaConfiguracoes = lazy(() => import("./pages/agencia/Configuracoes"));
const AgenciaCalendario = lazy(() => import("./pages/agencia/Calendario"));
const AgenciaContasReceber = lazy(() => import("./pages/agencia/ContasReceber"));
const AgenciaImpostoRenda = lazy(() => import("./pages/agencia/ImpostoRenda"));
const AgenciaCruzeiros = lazy(() => import("./pages/agencia/Cruzeiros"));
const AgenciaSeguros = lazy(() => import("./pages/agencia/Seguros"));
const AgenciaAtracoes = lazy(() => import("./pages/agencia/Atracoes"));
const AgenciaTransportes = lazy(() => import("./pages/agencia/Transportes"));


// System pages
const SistemaProgramas = lazy(() => import("./pages/sistema/Programas"));
const LimiteCPF = lazy(() => import("./pages/sistema/LimiteCPF"));

// Wrapper that conditionally loads heavy providers only for authenticated routes
const ConditionalProviders = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isPublicRoute = ['/', '/auth', '/instalar', '/sobre', '/blog', '/termos', '/privacidade'].includes(location.pathname);
  
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  return (
    <Suspense fallback={<PageLoading />}>
      <ProtectedProviders>{children}</ProtectedProviders>
    </Suspense>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  
  // Track page views with PostHog
  useEffect(() => {
    pageview(location.pathname);
  }, [location.pathname]);
  
  return (
  <AppErrorBoundary>
    <ConditionalProviders>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/instalar" element={<Instalar />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/admin/blog" element={<ProtectedRoute><BlogAdmin /></ProtectedRoute>} />
          {/* TEL-02 / D-14 — server-side gated by profiles.is_admin in the
              mrr-dashboard edge fn; client-side <Navigate to="/" /> on non-admin. */}
          <Route path="/admin/metrics" element={<ProtectedRoute><AdminMetrics /></ProtectedRoute>} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/lgpd/confirm" element={<ProtectedRoute><LgpdConfirmDelete /></ProtectedRoute>} />
          <Route path="/lgpd/confirm-delete" element={<ProtectedRoute><LgpdConfirmDelete /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/logos" element={<LogosGallery />} />
          <Route path="/qa-design" element={<QaDesign />} />
          <Route path="/qa-mobile" element={<QaMobile />} />
          <Route path="/analises" element={<ProtectedRoute><Analises /></ProtectedRoute>} />
          <Route path="/simulador" element={<ProtectedRoute><Simulador /></ProtectedRoute>} />
          <Route path="/titulares" element={<ProtectedRoute><Titulares /></ProtectedRoute>} />
          {/* QA audit (sas.txt Bug 1) — /relatorios is Pro+ only. Previously
              the page rendered the full content with an UpgradePrompt dialog
              on top; clicking "Agora não" closed the dialog and left the
              report data fully accessible. PlanProtectedRoute redirects Free
              users to /assinatura BEFORE the route mounts. */}
          <Route path="/relatorios" element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro']}><Relatorios /></PlanProtectedRoute></ProtectedRoute>} />
          <Route path="/lancamentos/compra" element={<ProtectedRoute><Compra /></ProtectedRoute>} />
          <Route path="/lancamentos/transferencia" element={<ProtectedRoute><Transferencia /></ProtectedRoute>} />
          <Route path="/lancamentos/venda" element={<Navigate to="/agencia/venda" replace />} />
          <Route path="/lancamentos/entrada" element={<ProtectedRoute><EntradaManual /></ProtectedRoute>} />
          <Route path="/lancamentos/bumerangue" element={<ProtectedRoute><Bumerangue /></ProtectedRoute>} />
          <Route path="/lancamentos/compra-turbinada" element={<ProtectedRoute><CompraTurbinada /></ProtectedRoute>} />
          <Route path="/lancamentos/compra-carrinho" element={<ProtectedRoute><CompraCarrinho /></ProtectedRoute>} />
          <Route path="/lancamentos/transferencia-cartao" element={<ProtectedRoute><TransferenciaCartao /></ProtectedRoute>} />
          <Route path="/lancamentos/passagem-emitida" element={<ProtectedRoute><PassagemEmitida /></ProtectedRoute>} />
          <Route path="/lancamentos/saida-manual" element={<ProtectedRoute><SaidaManual /></ProtectedRoute>} />
          <Route path="/operacoes/visao-geral" element={<ProtectedRoute><VisaoGeral /></ProtectedRoute>} />
          <Route path="/gestao/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
          <Route path="/gestao/cartoes/:id" element={<ProtectedRoute><CartaoDetalhes /></ProtectedRoute>} />
          <Route path="/gestao/precos-programas" element={<ProtectedRoute><PrecosProgramas /></ProtectedRoute>} />
          <Route path="/gestao/bonus-pendentes" element={<ProtectedRoute><BonusPendentes /></ProtectedRoute>} />
          <Route path="/gestao/clube-assinante" element={<ProtectedRoute><ClubeAssinante /></ProtectedRoute>} />
          <Route path="/lancamentos/sala-vip" element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro', 'vip']}><SalaVIP /></PlanProtectedRoute></ProtectedRoute>} />
          
          {/* Reports - Pro+ only (QA audit sas.txt Bug 1 — sub-routes were
              relying on the in-page UpgradePrompt that was bypassable. Now
              gated by PlanProtectedRoute at the route level. */}
          <Route path="/relatorios/cartoes" element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro']}><CartoesRelatorio /></PlanProtectedRoute></ProtectedRoute>} />
          <Route path="/relatorios/passagens" element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro']}><PassagensEmitidasRelatorio /></PlanProtectedRoute></ProtectedRoute>} />
          <Route path="/relatorios/economia" element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro']}><EconomiaRelatorio /></PlanProtectedRoute></ProtectedRoute>} />
          <Route path="/programa/:program" element={<ProtectedRoute><ProgramaDetalhado /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/conquistas" element={<ProtectedRoute><Conquistas /></ProtectedRoute>} />
          <Route path="/assinatura" element={<ProtectedRoute><Assinatura /></ProtectedRoute>} />
          {/* Plan 02-06 TIER-03 / D-13 — Pro killer feature (personalized
              transfer-promotion alerts). RLS blocks Free SELECT; the page also
              <Navigate>'s to /assinatura when canAccessPro is false. */}
          {/* Promo engine is an Agency-tier module (product spec). TierRoute
              redirects Starter/Pro accounts to /dashboard; the page keeps its
              own subscription_plan gate for billing on top. */}
          <Route path="/promocoes" element={<ProtectedRoute><TierRoute module="promoEngine"><Promocoes /></TierRoute></ProtectedRoute>} />
          <Route path="/sistema/programas" element={<ProtectedRoute><SistemaProgramas /></ProtectedRoute>} />
          <Route path="/sistema/limite-cpf" element={<ProtectedRoute><LimiteCPF /></ProtectedRoute>} />
          {/* Professional (Pro+) routes — the travel-agency ops suite + client
              management. Gated by TierRoute (the product-module guard): Starter
              accounts are redirected back to /dashboard. This replaces the
              previous PlanProtectedRoute(pro) gate — access is now decided by
              product_tier, not the billing tier. */}
          <Route path="/agencia" element={<ProtectedRoute><TierRoute minTier="pro"><AgenciaDashboard /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/clientes" element={<ProtectedRoute><TierRoute module="clients"><AgenciaClientes /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/passagens" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaPassagens /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/hoteis" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaHoteis /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/carros" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaCarros /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/orcamentos" element={<ProtectedRoute><TierRoute module="clients"><AgenciaOrcamentos /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/configuracoes" element={<ProtectedRoute><TierRoute minTier="pro"><AgenciaConfiguracoes /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/calendario" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaCalendario /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/contas-receber" element={<ProtectedRoute><TierRoute module="clientReports"><AgenciaContasReceber /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/imposto-renda" element={<ProtectedRoute><TierRoute module="informeRendimentos"><AgenciaImpostoRenda /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/venda" element={<ProtectedRoute><TierRoute minTier="pro"><Venda /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/cruzeiros" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaCruzeiros /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/seguros" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaSeguros /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/atracoes" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaAtracoes /></TierRoute></ProtectedRoute>} />
          <Route path="/agencia/transportes" element={<ProtectedRoute><TierRoute module="travelBooking"><AgenciaTransportes /></TierRoute></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <OfflineIndicator />
      {/* LGPD Art. 8 §4 granular consent banner (Plan 02-02 W1a / COMPL-03) —
          renders only for authenticated users without a current-version consent row. */}
      <ConsentBanner />
      {/* Bridges useConsent().analyticsOptedIn (Plan 02-02) → PostHog opt-in
          (Plan 02-03 / TEL-01 / Gate G-HIGH-03). Renders null. */}
      <ConsentWatcher />
      {/* Helpdesk live-chat (Plan 02-04 W1c / LAUNCH-05 / D-23 Crisp free tier).
          Lifecycle-only — gated on VITE_CRISP_WEBSITE_ID + marketing consent +
          NOT iOS Capacitor (Path C). Renders null. */}
      <CrispWidget />
    </ConditionalProviders>
  </AppErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LocalizationProvider>
        <AuthProvider>
          {/* Plan 02-06 W2b — VIP multi-CPF active-account context.
              Mounted inside AuthProvider so it can read user.id; outside
              the router so the activeUserId state survives route changes. */}
          <ManagedAccountProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </ManagedAccountProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
