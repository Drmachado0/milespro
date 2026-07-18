import {
  ShoppingCart,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Plane,
  ArrowRightLeft,
  Rocket,
  RotateCcw,
  CreditCard,
  Users,
  Gift,
  Crown,
  Coins,
  Calculator,
  Bell,
  FileText,
  BarChart3,
  UserCheck,
  FileQuestion,
  Receipt,
  Target,
  Wallet,
  Calendar,
  Car,
  Hotel,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProductTier, tierAtLeast } from '@/config/planModules';

export interface QuickActionDefinition {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
  category: 'operations' | 'strategies' | 'management' | 'tools' | 'reservations';
  colorClass: string;
  // Product-module gate: action is hidden below this tier (starter/pro/agency).
  requiredTier?: ProductTier;
}

export const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operações',
  strategies: 'Estratégias',
  management: 'Gestão',
  tools: 'Ferramentas',
  reservations: 'Reservas',
};

export const CATEGORY_COLORS: Record<string, string> = {
  operations: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  strategies: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  management: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  tools: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  reservations: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export const ALL_QUICK_ACTIONS: QuickActionDefinition[] = [
  // Operações
  {
    id: 'compra',
    labelKey: 'operations.purchase',
    icon: ShoppingCart,
    path: '/lancamentos/compra',
    category: 'operations',
    colorClass: 'from-primary/20 to-primary/5 text-primary border-primary/20',
  },
  {
    id: 'venda',
    labelKey: 'operations.sale',
    icon: TrendingUp,
    path: '/agencia/venda',
    category: 'operations',
    colorClass: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    requiredTier: 'pro',
  },
  {
    id: 'entrada',
    labelKey: 'operations.manualEntry',
    icon: Plus,
    path: '/lancamentos/entrada',
    category: 'operations',
    colorClass: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'saida',
    labelKey: 'operations.manualExit',
    icon: ArrowUpRight,
    path: '/lancamentos/saida-manual',
    category: 'operations',
    colorClass: 'from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400 border-red-500/20',
  },
  {
    id: 'passagem',
    labelKey: 'operations.issuedTicket',
    icon: Plane,
    path: '/lancamentos/passagem-emitida',
    category: 'operations',
    colorClass: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },

  // Estratégias
  {
    id: 'transferencia',
    labelKey: 'operations.transfer',
    icon: ArrowRightLeft,
    path: '/lancamentos/transferencia',
    category: 'strategies',
    colorClass: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  {
    id: 'compra-turbinada',
    labelKey: 'operations.turboPurchase',
    icon: Rocket,
    path: '/lancamentos/compra-turbinada',
    category: 'strategies',
    colorClass: 'from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  {
    id: 'bumerangue',
    labelKey: 'operations.boomerang',
    icon: RotateCcw,
    path: '/lancamentos/bumerangue',
    category: 'strategies',
    colorClass: 'from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
  {
    id: 'transferencia-cartao',
    labelKey: 'operations.cardTransfer',
    icon: CreditCard,
    path: '/lancamentos/transferencia-cartao',
    category: 'strategies',
    colorClass: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },

  // Gestão
  {
    id: 'titulares',
    labelKey: 'nav.holders',
    icon: Users,
    path: '/titulares',
    category: 'management',
    colorClass: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'cartoes',
    labelKey: 'management.cards',
    icon: CreditCard,
    path: '/gestao/cartoes',
    category: 'management',
    colorClass: 'from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  {
    id: 'bonus',
    labelKey: 'bonuses.title',
    icon: Gift,
    path: '/gestao/bonus-pendentes',
    category: 'management',
    colorClass: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  {
    id: 'sala-vip',
    labelKey: 'management.vipLounge',
    icon: Crown,
    path: '/lancamentos/sala-vip',
    category: 'management',
    colorClass: 'from-yellow-500/20 to-yellow-500/5 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  },
  {
    id: 'precos',
    labelKey: 'prices.title',
    icon: Coins,
    path: '/gestao/precos-programas',
    category: 'management',
    colorClass: 'from-teal-500/20 to-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20',
  },
  {
    id: 'clube',
    labelKey: 'management.clubSubscriber',
    icon: Wallet,
    path: '/gestao/clube-assinante',
    category: 'management',
    colorClass: 'from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },

  // Ferramentas
  {
    id: 'simulador',
    labelKey: 'nav.simulators',
    icon: Calculator,
    path: '/simulador',
    category: 'tools',
    colorClass: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  {
    id: 'alertas',
    labelKey: 'nav.alerts',
    icon: Bell,
    path: '/alertas',
    category: 'tools',
    colorClass: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  {
    id: 'relatorios',
    labelKey: 'nav.generalReports',
    icon: FileText,
    path: '/relatorios',
    category: 'tools',
    colorClass: 'from-slate-500/20 to-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  {
    id: 'analises',
    labelKey: 'nav.programs',
    icon: BarChart3,
    path: '/analises',
    category: 'tools',
    colorClass: 'from-green-500/20 to-green-500/5 text-green-600 dark:text-green-400 border-green-500/20',
  },
  {
    id: 'metas',
    labelKey: 'goals.title',
    icon: Target,
    path: '/gestao/precos-programas',
    category: 'tools',
    colorClass: 'from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },

  // Reservas (Travel Agency)
  {
    id: 'clientes',
    labelKey: 'agency.clients',
    icon: UserCheck,
    path: '/agencia/clientes',
    category: 'reservations',
    colorClass: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'orcamentos',
    labelKey: 'agency.quotes',
    icon: FileQuestion,
    path: '/agencia/orcamentos',
    category: 'reservations',
    colorClass: 'from-lime-500/20 to-lime-500/5 text-lime-600 dark:text-lime-400 border-lime-500/20',
  },
  {
    id: 'imposto-renda',
    labelKey: 'incomeTax.title',
    icon: Receipt,
    path: '/agencia/imposto-renda',
    category: 'reservations',
    colorClass: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'calendario',
    labelKey: 'agency.calendar',
    icon: Calendar,
    path: '/agencia/calendario',
    category: 'reservations',
    colorClass: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'carros',
    labelKey: 'agency.cars',
    icon: Car,
    path: '/agencia/carros',
    category: 'reservations',
    colorClass: 'from-gray-500/20 to-gray-500/5 text-gray-600 dark:text-gray-400 border-gray-500/20',
  },
  {
    id: 'hoteis',
    labelKey: 'agency.hotels',
    icon: Hotel,
    path: '/agencia/hoteis',
    category: 'reservations',
    colorClass: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  {
    id: 'configuracoes',
    labelKey: 'nav.settings',
    icon: Settings,
    path: '/configuracoes',
    category: 'tools',
    colorClass: 'from-gray-500/20 to-gray-500/5 text-gray-600 dark:text-gray-400 border-gray-500/20',
  },
];

export const DEFAULT_QUICK_ACTIONS = ['compra', 'venda', 'transferencia', 'passagem', 'simulador', 'alertas'];

export const MAX_QUICK_ACTIONS = 9;
export const MIN_QUICK_ACTIONS = 3;

export function getActionById(id: string): QuickActionDefinition | undefined {
  return ALL_QUICK_ACTIONS.find(action => action.id === id);
}

export function getActionsByCategory(category: string): QuickActionDefinition[] {
  return ALL_QUICK_ACTIONS.filter(action => action.category === category);
}

export function getActionsByIds(ids: string[]): QuickActionDefinition[] {
  return ids
    .map(id => getActionById(id))
    .filter((action): action is QuickActionDefinition => action !== undefined);
}

// Effective minimum tier for an action: its explicit requiredTier, else the
// whole 'reservations' category is Pro+ (the professional travel-agency ops);
// everything else is personal and available from Free up.
function actionMinTier(action: QuickActionDefinition): ProductTier {
  return action.requiredTier ?? (action.category === 'reservations' ? 'pro' : 'free');
}

// Drop actions above the given product tier — used by the quick-actions widget
// and the edit dialog so Starter never sees agency shortcuts.
export function filterQuickActionsByTier(
  actions: QuickActionDefinition[],
  tier: ProductTier
): QuickActionDefinition[] {
  return actions.filter(action => tierAtLeast(tier, actionMinTier(action)));
}
