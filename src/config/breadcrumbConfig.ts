/**
 * Configuração centralizada de breadcrumbs
 * Espelha exatamente a estrutura do menu lateral (sidebarNavigation.ts)
 */

// Grupos de navegação - usados para mapear segmentos de URL para labels de grupo
export const BREADCRUMB_GROUPS: Record<string, { label: string; defaultPath: string }> = {
  // Cadastro
  gestao: { label: 'Cadastro', defaultPath: '/titulares' },
  titulares: { label: 'Cadastro', defaultPath: '/titulares' },
  
  // Lançamentos
  lancamentos: { label: 'Lançamentos', defaultPath: '/operacoes/visao-geral' },
  operacoes: { label: 'Lançamentos', defaultPath: '/operacoes/visao-geral' },
  
  // Estratégias
  estrategias: { label: 'Estratégias', defaultPath: '/lancamentos/compra-turbinada' },
  
  // Reservas
  agencia: { label: 'Reservas', defaultPath: '/agencia/calendario' },
  
  // Análises & Relatórios
  analises: { label: 'Análises & Relatórios', defaultPath: '/analises' },
  relatorios: { label: 'Análises & Relatórios', defaultPath: '/relatorios' },
  
  // Sistema
  sistema: { label: 'Sistema', defaultPath: '/sistema/programas' },
  conquistas: { label: 'Sistema', defaultPath: '/conquistas' },
  alertas: { label: 'Sistema', defaultPath: '/alertas' },
  configuracoes: { label: 'Sistema', defaultPath: '/configuracoes' },
};

// Labels específicos para cada rota final
export const BREADCRUMB_LABELS: Record<string, string> = {
  // Dashboard
  dashboard: 'Dashboard',
  
  // ===== CADASTRO =====
  titulares: 'Titulares',
  cartoes: 'Cartões',
  'clube-assinante': 'Assinaturas',
  'precos-programas': 'Milheiros de Referência',
  
  // ===== LANÇAMENTOS =====
  'visao-geral': 'Visão Geral',
  entrada: 'Entrada Manual',
  'saida-manual': 'Saída Manual',
  'passagem-emitida': 'Passagem Emitida',
  'bonus-pendentes': 'Bônus Pendentes',
  'sala-vip': 'Sala VIP',
  venda: 'Venda de Milhas',
  
  // ===== ESTRATÉGIAS =====
  'compra-turbinada': 'Compra Turbinada',
  compra: 'Compra de Milhas',
  'compra-carrinho': 'Compra do Carrinho',
  bumerangue: 'Bumerangue',
  transferencia: 'Transferência',
  'transferencia-cartao': 'Transferência via Cartão',
  simulador: 'Simuladores',
  
  // ===== RESERVAS =====
  calendario: 'Calendário',
  passagens: 'Passagens',
  hoteis: 'Hotéis',
  carros: 'Carros',
  cruzeiros: 'Cruzeiros',
  seguros: 'Seguro Viagem',
  atracoes: 'Atrações Turísticas',
  transportes: 'Transportes',
  economia: 'Economia Gerada',
  
  // ===== ANÁLISES & RELATÓRIOS =====
  analises: 'Programas',
  programa: 'Detalhes do Programa',
  relatorios: 'Relatórios Gerais',
  
  // ===== SISTEMA =====
  conquistas: 'Conquistas',
  alertas: 'Alertas',
  programas: 'Programas',
  'limite-cpf': 'Limites de CPF',
  configuracoes: 'Configurações',
  
  // Outros
  clube: 'Assinaturas',
};

// Mapeamento de rotas para grupo pai
// Usado quando a URL não contém explicitamente o grupo
export const ROUTE_TO_GROUP: Record<string, string> = {
  // Rotas que pertencem ao grupo "Cadastro"
  '/titulares': 'gestao',
  '/gestao/cartoes': 'gestao',
  '/gestao/clube-assinante': 'gestao',
  '/gestao/precos-programas': 'gestao',
  '/clube': 'gestao',
  
  // Rotas que pertencem ao grupo "Lançamentos"
  '/operacoes/visao-geral': 'lancamentos',
  '/lancamentos/entrada': 'lancamentos',
  '/lancamentos/saida-manual': 'lancamentos',
  '/lancamentos/passagem-emitida': 'lancamentos',
  '/gestao/bonus-pendentes': 'lancamentos',
  '/lancamentos/sala-vip': 'lancamentos',
  '/agencia/venda': 'lancamentos',
  
  // Rotas que pertencem ao grupo "Estratégias"
  '/lancamentos/compra-turbinada': 'estrategias',
  '/lancamentos/compra': 'estrategias',
  '/lancamentos/compra-carrinho': 'estrategias',
  '/lancamentos/bumerangue': 'estrategias',
  '/lancamentos/transferencia': 'estrategias',
  '/lancamentos/transferencia-cartao': 'estrategias',
  '/simulador': 'estrategias',
  
  // Rotas que pertencem ao grupo "Reservas"
  '/agencia/calendario': 'agencia',
  '/agencia/passagens': 'agencia',
  '/agencia/hoteis': 'agencia',
  '/agencia/carros': 'agencia',
  '/agencia/cruzeiros': 'agencia',
  '/agencia/seguros': 'agencia',
  '/agencia/atracoes': 'agencia',
  '/agencia/transportes': 'agencia',
  '/agencia/economia': 'agencia',
  
  // Rotas que pertencem ao grupo "Análises & Relatórios"
  '/analises': 'analises',
  '/relatorios': 'analises',
  '/relatorios/economia': 'analises',
  '/relatorios/passagens': 'analises',
  '/relatorios/cartoes': 'analises',
  
  // Rotas que pertencem ao grupo "Sistema"
  '/conquistas': 'sistema',
  '/alertas': 'sistema',
  '/sistema/programas': 'sistema',
  '/sistema/limite-cpf': 'sistema',
  '/configuracoes': 'sistema',
};

export interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

/**
 * Gera os itens de breadcrumb a partir do pathname
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Não mostrar breadcrumb no dashboard
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  
  // Verificar se a rota tem um grupo pai mapeado
  const groupKey = ROUTE_TO_GROUP[pathname];
  const groupInfo = groupKey ? BREADCRUMB_GROUPS[groupKey] : null;
  
  if (groupInfo) {
    // Adicionar o grupo como primeiro item
    items.push({
      label: groupInfo.label,
      path: groupInfo.defaultPath,
      isLast: false,
    });
  }
  
  // Adicionar o item final (página atual)
  const lastSegment = pathSegments[pathSegments.length - 1];
  const finalLabel = BREADCRUMB_LABELS[lastSegment] || 
    lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
  
  // Se não adicionamos um grupo, verificar se o primeiro segmento é um grupo
  if (!groupInfo && pathSegments.length > 1) {
    const firstSegment = pathSegments[0];
    const firstGroupInfo = BREADCRUMB_GROUPS[firstSegment];
    
    if (firstGroupInfo) {
      items.push({
        label: firstGroupInfo.label,
        path: firstGroupInfo.defaultPath,
        isLast: false,
      });
    }
  }
  
  // Adicionar a página final
  items.push({
    label: finalLabel,
    path: pathname,
    isLast: true,
  });
  
  return items;
}
