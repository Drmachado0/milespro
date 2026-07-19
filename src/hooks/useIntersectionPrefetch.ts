// Route prefetch map - lazy load components when they become visible
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/simulador': () => import('../pages/Simulador'),
  '/analises': () => import('../pages/Analises'),
  '/relatorios': () => import('../pages/Relatorios'),
  '/titulares': () => import('../pages/Titulares'),
  '/alertas': () => import('../pages/Alertas'),
  '/configuracoes': () => import('../pages/Configuracoes'),
  '/gestao/cartoes': () => import('../pages/gestao/Cartoes'),
  '/gestao/precos-programas': () => import('../pages/gestao/PrecosProgramas'),
  '/gestao/bonus-pendentes': () => import('../pages/gestao/BonusPendentes'),
  '/gestao/sala-vip': () => import('../pages/gestao/SalaVIP'),
  '/gestao/clube-assinante': () => import('../pages/gestao/ClubeAssinante'),
  '/lancamentos/compra': () => import('../pages/operacoes/Compra'),
  '/lancamentos/transferencia': () => import('../pages/operacoes/Transferencia'),
  '/lancamentos/venda': () => import('../pages/operacoes/Venda'),
  '/operacoes/visao-geral': () => import('../pages/operacoes/VisaoGeral'),
  '/agencia': () => import('../pages/agencia/Dashboard'),
  '/conquistas': () => import('../pages/Conquistas'),
};

const prefetchedRoutes = new Set<string>();

/**
 * Manually trigger prefetch for a specific route
 */
export function prefetchRoute(route: string) {
  if (prefetchedRoutes.has(route)) return;
  
  const prefetchFn = routePrefetchMap[route];
  if (prefetchFn) {
    prefetchedRoutes.add(route);
    prefetchFn().catch(() => {
      prefetchedRoutes.delete(route);
    });
  }
}
