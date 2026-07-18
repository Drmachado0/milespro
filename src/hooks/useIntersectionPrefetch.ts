import { useEffect, useRef, useCallback } from 'react';

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
 * Hook to prefetch routes when elements become visible using IntersectionObserver.
 * Useful for mobile where hover events don't exist.
 */
export function useIntersectionPrefetch(route: string) {
  const elementRef = useRef<HTMLAnchorElement>(null);

  const prefetch = useCallback(() => {
    if (prefetchedRoutes.has(route)) return;
    
    const prefetchFn = routePrefetchMap[route];
    if (prefetchFn) {
      prefetchedRoutes.add(route);
      prefetchFn().catch(() => {
        // Remove from set if prefetch fails so it can retry
        prefetchedRoutes.delete(route);
      });
    }
  }, [route]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if already prefetched
    if (prefetchedRoutes.has(route)) return;

    // Only use IntersectionObserver on mobile/touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Delay prefetch slightly to avoid loading everything at once
            setTimeout(prefetch, 100);
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: '50px', // Start prefetching slightly before element is visible
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [route, prefetch]);

  return { ref: elementRef, prefetch };
}

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
