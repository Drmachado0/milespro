import {
  Home,
  ShoppingCart,
  CreditCard,
  ArrowLeftRight,
  Ticket,
  BarChart3,
  Calculator,
  Bell,
  Settings,
  Users,
  FileText,
  Plane,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
  RotateCcw,
  ClipboardList,
  Zap,
  Gift,
  Coins,
  Banknote,
  Building2,
  Car,
  UserCheck,
  FileQuestion,
  Calendar,
  DollarSign,
  TrendingUp,
  FolderCog,
  SlidersHorizontal,
  BookOpen,
  Crown,
  Trophy,
  Receipt,
  Layers,
  Users2,
  Ship,
  ShieldCheck,
  Landmark,
  Bus,
  PiggyBank,
  LucideIcon,
} from 'lucide-react';

import { ProductTier, tierAtLeast } from './planModules';

export type PlanType = 'free' | 'pro' | 'vip';

export interface NavItem {
  labelKey: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
  // Billing lock (free/pro/vip): item stays VISIBLE with a lock icon.
  requiredPlan?: PlanType;
  // Product-module gate (starter/pro/agency): item is HIDDEN below this tier.
  requiredTier?: ProductTier;
  badge?: string | number;
}

export interface NavGroup {
  titleKey: string;
  titleIcon?: LucideIcon;
  items: NavItem[];
  hideTitle?: boolean;
  requiredPlan?: PlanType;
  // Product-module gate: the whole group is hidden below this tier.
  requiredTier?: ProductTier;
}

// Dashboard - Fixed at top
export const dashboardNavItems: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: Home, to: '/dashboard', end: true },
];

// Registration section (formerly Management)
export const cadastroNavItems: NavItem[] = [
  { labelKey: 'nav.holders', icon: Users, to: '/titulares', end: true },
  { labelKey: 'management.cards', icon: CreditCard, to: '/gestao/cartoes', end: true },
  { labelKey: 'subscriptions.title', icon: Banknote, to: '/gestao/clube-assinante', end: true },
  { labelKey: 'prices.title', icon: Coins, to: '/gestao/precos-programas', end: true },
];

// Operations section (Starter — personal statement/operations)
// 'Venda de Milhas' as a client SERVICE (/agencia/venda) moved to the Pro+
// surface (see agencyManagementNavItems). Selling one's OWN miles as a personal
// transaction type is still tracked here via the manual entry/exit operations.
export const operationsNavItems: NavItem[] = [
  { labelKey: 'nav.allOperations', icon: ClipboardList, to: '/operacoes/visao-geral', end: true },
  { labelKey: 'operations.manualEntry', icon: ArrowDownRight, to: '/lancamentos/entrada', end: true },
  { labelKey: 'operations.manualExit', icon: ArrowUpRight, to: '/lancamentos/saida-manual', end: true },
  { labelKey: 'operations.issuedTicket', icon: Send, to: '/lancamentos/passagem-emitida', end: true },
  { labelKey: 'bonuses.title', icon: Gift, to: '/gestao/bonus-pendentes', end: true },
  // W-3 re-tiering: legacy mid-tier -> 'pro' (canonical). VIP Lounge tracking is a
  // mid-tier feature (own VIP lounge airport visits), NOT the multi-CPF/agency VIP product tier.
  { labelKey: 'management.vipLounge', icon: Crown, to: '/lancamentos/sala-vip', requiredPlan: 'pro', end: true },
];

// Strategies section
export const strategiesNavItems: NavItem[] = [
  { labelKey: 'operations.turboPurchase', icon: Rocket, to: '/lancamentos/compra-turbinada', end: true },
  { labelKey: 'operations.purchase', icon: DollarSign, to: '/lancamentos/compra', end: true },
  { labelKey: 'operations.cartPurchase', icon: ShoppingCart, to: '/lancamentos/compra-carrinho', end: true },
  { labelKey: 'operations.boomerang', icon: RotateCcw, to: '/lancamentos/bumerangue', end: true },
  { labelKey: 'operations.transfer', icon: ArrowLeftRight, to: '/lancamentos/transferencia', end: true },
  { labelKey: 'operations.cardTransfer', icon: CreditCard, to: '/lancamentos/transferencia-cartao', end: true },
  // W-3 re-tiering: simulators are Pro-tier capabilities (not VIP-exclusive).
  { labelKey: 'nav.simulators', icon: Calculator, to: '/simulador', requiredPlan: 'pro', end: true },
];

// Agency management section — PRO+ (product_tier >= 'pro').
// The professional surface for managing third parties: client CRM, quotes,
// receivables, miles sales, and agency-level income tax. Only routes that
// actually exist in App.tsx are listed (Comunicacao page exists but has no
// route yet, so it is intentionally omitted to avoid a 404 menu entry).
export const agencyManagementNavItems: NavItem[] = [
  { labelKey: 'agency.panel', icon: TrendingUp, to: '/agencia', end: true },
  { labelKey: 'agency.clients', icon: Users, to: '/agencia/clientes', end: true },
  { labelKey: 'agency.quotes', icon: FileQuestion, to: '/agencia/orcamentos', end: true },
  { labelKey: 'agency.receivables', icon: Receipt, to: '/agencia/contas-receber', end: true },
  { labelKey: 'operations.sale', icon: Ticket, to: '/agencia/venda', end: true },
  { labelKey: 'incomeTax.title', icon: FileText, to: '/agencia/imposto-renda', end: true },
  { labelKey: 'agency.agencySettings', icon: Settings, to: '/agencia/configuracoes', end: true },
];

// Reservations section (formerly Travel Agency) - PRO+ (product_tier >= 'pro')
export const reservationsNavItems: NavItem[] = [
  { labelKey: 'agency.calendar', icon: Calendar, to: '/agencia/calendario', end: true },
  { labelKey: 'agency.ticketIssuance', icon: Ticket, to: '/agencia/passagens', end: true },
  { labelKey: 'agency.hotelBookings', icon: Building2, to: '/agencia/hoteis', end: true },
  { labelKey: 'agency.carRentals', icon: Car, to: '/agencia/carros', end: true },
  { labelKey: 'agency.cruises', icon: Ship, to: '/agencia/cruzeiros', end: true },
  { labelKey: 'agency.travelInsurance', icon: ShieldCheck, to: '/agencia/seguros', end: true },
  { labelKey: 'agency.attractions', icon: Landmark, to: '/agencia/atracoes', end: true },
  { labelKey: 'agency.transfers', icon: Bus, to: '/agencia/transportes', end: true },
  // QA audit (sas.txt Bug 4) — `/agencia/economia` had no route. The
  // equivalent surface lives under `/relatorios/economia` (registered in
  // App.tsx alongside the other report sub-routes). Pointing the sidebar
  // there so the menu item no longer 404s.
  { labelKey: 'agency.totalSavings', icon: PiggyBank, to: '/relatorios/economia', end: true },
];

// Analytics & Reports section - most items require pro (legacy mid-tier per W-3 re-tiering)
export const analyticsNavItems: NavItem[] = [
  { labelKey: 'nav.programs', icon: BarChart3, to: '/analises', end: true },
  { labelKey: 'reports.savings', icon: PiggyBank, to: '/relatorios/economia', requiredPlan: 'pro', end: true },
  { labelKey: 'reports.issuedTickets', icon: Plane, to: '/relatorios/passagens', requiredPlan: 'pro', end: true },
  { labelKey: 'reports.cardReport', icon: CreditCard, to: '/relatorios/cartoes', requiredPlan: 'pro', end: true },
  { labelKey: 'nav.generalReports', icon: FileText, to: '/relatorios', requiredPlan: 'pro', end: true },
];

// System section - Fixed at bottom
export const systemNavItems: NavItem[] = [
  { labelKey: 'nav.achievements', icon: Trophy, to: '/conquistas', end: true },
  { labelKey: 'nav.alerts', icon: Bell, to: '/alertas', end: true },
  { labelKey: 'nav.programsCompanies', icon: Layers, to: '/sistema/programas', end: true },
  { labelKey: 'nav.cpfLimits', icon: Users2, to: '/sistema/limite-cpf', end: true },
  { labelKey: 'nav.blogAdmin', icon: BookOpen, to: '/admin/blog', end: true },
  { labelKey: 'nav.settings', icon: Settings, to: '/configuracoes', end: true },
];

// STARTER groups — the personal miles core that every authenticated user gets.
// No requiredTier: these are the baseline experience.
const starterNavGroups: NavGroup[] = [
  {
    titleKey: 'nav.home',
    hideTitle: true,
    items: dashboardNavItems,
  },
  {
    titleKey: 'nav.registration',
    titleIcon: FolderCog,
    items: cadastroNavItems,
  },
  {
    titleKey: 'nav.operations',
    titleIcon: BookOpen,
    items: operationsNavItems,
  },
  {
    titleKey: 'nav.strategies',
    titleIcon: Zap,
    items: strategiesNavItems,
  },
  {
    titleKey: 'nav.analyticsReports',
    titleIcon: TrendingUp,
    items: analyticsNavItems,
  },
];

// PRO+ groups — the professional surface (managing third parties + the legacy
// travel-agency ops suite). Gated by product_tier via requiredTier: 'pro', so
// they are HIDDEN from Starter entirely. The Agency-tier intelligence modules
// (promo engine, goals, community, course) will be added here with
// requiredTier: 'agency' as their routes land.
const professionalNavGroups: NavGroup[] = [
  {
    titleKey: 'nav.travelAgency',
    titleIcon: Building2,
    items: agencyManagementNavItems,
    requiredTier: 'pro',
  },
  {
    titleKey: 'nav.reservations',
    titleIcon: Calendar,
    items: reservationsNavItems,
    requiredTier: 'pro',
  },
];

const systemNavGroup: NavGroup = {
  titleKey: 'nav.system',
  titleIcon: SlidersHorizontal,
  items: systemNavItems,
};

// Filter a tier-tagged list down to what `tier` can see (group- and item-level
// requiredTier). System stays pinned to the bottom.
const visibleForTier = (groups: NavGroup[], tier: ProductTier): NavGroup[] =>
  groups
    .filter(group => !group.requiredTier || tierAtLeast(tier, group.requiredTier))
    .map(group => ({
      ...group,
      items: group.items.filter(
        item => !item.requiredTier || tierAtLeast(tier, item.requiredTier)
      ),
    }))
    .filter(group => group.items.length > 0);

// All navigation groups for a given product tier (Starter/Pro/Agency).
// starter → lean personal manager; pro/agency → the same PLUS the professional
// groups. Orthogonal to subscription_plan, which locks individual items with a
// lock icon via filterNavGroupsByPlan.
export const getNavGroups = (tier: ProductTier = 'starter'): NavGroup[] =>
  visibleForTier([...starterNavGroups, ...professionalNavGroups, systemNavGroup], tier);

// Helper to filter groups and items based on plan - but keep locked items visible with lock icon.
// Signature uses canAccessPro and canAccessVip (Plan 02 W-3): legacy mid-tier branch is dropped
// because every legacy-mid-tier nav item was re-tiered to 'pro'. No nav item currently requires 'vip'.
export const filterNavGroupsByPlan = (
  groups: NavGroup[],
  canAccessPro: boolean,
  canAccessVip: boolean = false
): NavGroup[] => {
  return groups
    .filter(group => {
      // Filter out groups that require pro if user doesn't have it
      if (group.requiredPlan === 'pro' && !canAccessPro) {
        return false;
      }
      // Filter out VIP-only groups (none in v1 — kept for future TIER-04 work)
      if (group.requiredPlan === 'vip' && !canAccessVip) {
        return false;
      }
      return true;
    })
    .map(group => ({
      ...group,
      // Keep all items but mark them as locked if user doesn't have access
      items: group.items.map(item => ({
        ...item,
        // Items are still visible but will be marked as locked
      })),
    }))
    .filter(group => group.items.length > 0); // Remove empty groups
};

// Helper to check if an item is locked for the current user
export const isItemLocked = (
  item: NavItem,
  canAccessPro: boolean,
  canAccessVip: boolean
): boolean => {
  if (item.requiredPlan === 'pro' && !canAccessPro) {
    return true;
  }
  if (item.requiredPlan === 'vip' && !canAccessVip) {
    return true;
  }
  return false;
};