import { 
  Footprints, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Wallet, 
  Crown, 
  Trophy, 
  Star,
  Bell,
  Zap,
  Sparkles,
  ShoppingCart,
  BadgeDollarSign,
  ArrowRightLeft,
  Plane,
  Layers,
  Medal,
  Award,
  Gem,
  DoorOpen,
  Map,
  Coins,
  Landmark,
  Rocket,
  Hotel,
  Car,
  Ship,
  Ticket,
  Bus,
  PiggyBank,
  TrendingDown,
  BarChart3,
  CircleDollarSign,
  Banknote,
  Target,
  Flame,
  ShieldCheck,
  LucideIcon 
} from 'lucide-react';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'onboarding' | 'milestone';

export type MilestoneMetric = 
  | 'operations_count' 
  | 'operation_type' 
  | 'programs_with_balance' 
  | 'vip_entries' 
  | 'total_miles'
  | 'savings_total'
  | 'savings_tickets'
  | 'savings_hotels'
  | 'savings_cars'
  | 'savings_cruises'
  | 'savings_insurances'
  | 'savings_attractions'
  | 'savings_transfers';

export interface MilestoneCondition {
  metric: MilestoneMetric;
  operationType?: string;
  threshold: number;
}

export interface BadgeCondition {
  type: 'first_step' | 'onboarding_step' | 'all_required' | 'all_complete' | 'milestone';
  stepId?: string;
  milestone?: MilestoneCondition;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  points: number;
  category: BadgeCategory;
  rarity: BadgeRarity;
  condition: BadgeCondition;
}

export interface UnlockedBadge {
  unlocked_at: string;
  seen: boolean;
}

export interface BadgesProgress {
  badges: Record<string, UnlockedBadge>;
  total_points: number;
}

// ============ ONBOARDING BADGES ============
const ONBOARDING_BADGES: Badge[] = [
  {
    id: 'first_steps',
    name: 'Primeiros Passos',
    description: 'Completou o primeiro passo do onboarding',
    icon: Footprints,
    points: 50,
    category: 'onboarding',
    rarity: 'common',
    condition: { type: 'first_step' }
  },
  {
    id: 'holder_master',
    name: 'Mestre dos Titulares',
    description: 'Cadastrou seu primeiro titular',
    icon: Users,
    points: 100,
    category: 'onboarding',
    rarity: 'common',
    condition: { type: 'onboarding_step', stepId: 'holders' }
  },
  {
    id: 'card_collector',
    name: 'Colecionador de Cartões',
    description: 'Adicionou seu primeiro cartão',
    icon: CreditCard,
    points: 100,
    category: 'onboarding',
    rarity: 'common',
    condition: { type: 'onboarding_step', stepId: 'cards' }
  },
  {
    id: 'price_analyst',
    name: 'Analista de Preços',
    description: 'Definiu preços de referência',
    icon: TrendingUp,
    points: 100,
    category: 'onboarding',
    rarity: 'rare',
    condition: { type: 'onboarding_step', stepId: 'prices' }
  },
  {
    id: 'balance_tracker',
    name: 'Controlador de Saldo',
    description: 'Registrou saldo inicial de milhas',
    icon: Wallet,
    points: 100,
    category: 'onboarding',
    rarity: 'rare',
    condition: { type: 'onboarding_step', stepId: 'balance' }
  },
  {
    id: 'club_member',
    name: 'Membro do Clube',
    description: 'Cadastrou assinatura de clube',
    icon: Crown,
    points: 150,
    category: 'onboarding',
    rarity: 'epic',
    condition: { type: 'onboarding_step', stepId: 'club' }
  },
  {
    id: 'alert_master',
    name: 'Mestre dos Alertas',
    description: 'Configurou alertas personalizados',
    icon: Bell,
    points: 100,
    category: 'onboarding',
    rarity: 'rare',
    condition: { type: 'onboarding_step', stepId: 'alerts' }
  },
  {
    id: 'first_move',
    name: 'Primeiro Movimento',
    description: 'Registrou sua primeira operação de milhas',
    icon: Zap,
    points: 150,
    category: 'onboarding',
    rarity: 'epic',
    condition: { type: 'onboarding_step', stepId: 'first_operation' }
  },
  {
    id: 'vip_explorer',
    name: 'Explorador VIP',
    description: 'Configurou cota de sala VIP em um cartão',
    icon: Sparkles,
    points: 100,
    category: 'onboarding',
    rarity: 'rare',
    condition: { type: 'onboarding_step', stepId: 'vip_quota' }
  },
  {
    id: 'onboarding_champion',
    name: 'Campeão do Onboarding',
    description: 'Completou todas as etapas obrigatórias',
    icon: Trophy,
    points: 200,
    category: 'onboarding',
    rarity: 'epic',
    condition: { type: 'all_required' }
  },
  {
    id: 'perfectionist',
    name: 'Perfeccionista',
    description: 'Completou 100% do onboarding incluindo opcionais',
    icon: Star,
    points: 300,
    category: 'onboarding',
    rarity: 'legendary',
    condition: { type: 'all_complete' }
  },
];

// ============ MILESTONE BADGES - OPERATIONS ============
const OPERATION_BADGES: Badge[] = [
  // Operation type badges
  {
    id: 'first_purchase',
    name: 'Primeira Compra',
    description: 'Registrou primeira compra de milhas',
    icon: ShoppingCart,
    points: 100,
    category: 'milestone',
    rarity: 'common',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'compra', threshold: 1 } 
    }
  },
  {
    id: 'first_sale',
    name: 'Primeira Venda',
    description: 'Realizou primeira venda de milhas',
    icon: BadgeDollarSign,
    points: 100,
    category: 'milestone',
    rarity: 'common',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'venda', threshold: 1 } 
    }
  },
  {
    id: 'first_transfer',
    name: 'Primeiro Transfer',
    description: 'Realizou primeira transferência entre programas',
    icon: ArrowRightLeft,
    points: 100,
    category: 'milestone',
    rarity: 'common',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'transferencia', threshold: 1 } 
    }
  },
  {
    id: 'first_boomerang',
    name: 'Primeiro Bumerangue',
    description: 'Realizou primeira operação bumerangue',
    icon: Flame,
    points: 100,
    category: 'milestone',
    rarity: 'common',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'bumerangue', threshold: 1 } 
    }
  },
  {
    id: 'first_turbo',
    name: 'Primeira Compra Turbinada',
    description: 'Realizou primeira compra turbinada',
    icon: Rocket,
    points: 100,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'compra_turbinada', threshold: 1 } 
    }
  },
  {
    id: 'first_redemption',
    name: 'Primeiro Resgate',
    description: 'Realizou primeiro resgate de milhas',
    icon: Plane,
    points: 150,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operation_type', operationType: 'resgate', threshold: 1 } 
    }
  },
];

// ============ MILESTONE BADGES - MULTI-PROGRAM ============
const MULTI_PROGRAM_BADGES: Badge[] = [
  {
    id: 'multi_program_3',
    name: 'Diversificador',
    description: 'Possui saldo em 3 ou mais programas',
    icon: Layers,
    points: 150,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'programs_with_balance', threshold: 3 } 
    }
  },
  {
    id: 'multi_program_5',
    name: 'Estrategista',
    description: 'Possui saldo em 5 ou mais programas',
    icon: BarChart3,
    points: 250,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'programs_with_balance', threshold: 5 } 
    }
  },
  {
    id: 'multi_program_7',
    name: 'Colecionador',
    description: 'Possui saldo em 7 ou mais programas',
    icon: Medal,
    points: 350,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'programs_with_balance', threshold: 7 } 
    }
  },
  {
    id: 'multi_program_10',
    name: 'Multi-Expert',
    description: 'Possui saldo em 10 ou mais programas',
    icon: Trophy,
    points: 500,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'programs_with_balance', threshold: 10 } 
    }
  },
];

// ============ MILESTONE BADGES - OPERATIONS COUNT ============
const OPERATIONS_COUNT_BADGES: Badge[] = [
  {
    id: 'operations_10',
    name: 'Operador Ativo',
    description: 'Registrou 10 operações',
    icon: Medal,
    points: 150,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operations_count', threshold: 10 } 
    }
  },
  {
    id: 'operations_50',
    name: 'Veterano',
    description: 'Registrou 50 operações',
    icon: Award,
    points: 300,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operations_count', threshold: 50 } 
    }
  },
  {
    id: 'operations_100',
    name: 'Centurião',
    description: 'Registrou 100 operações',
    icon: Gem,
    points: 500,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operations_count', threshold: 100 } 
    }
  },
  {
    id: 'operations_250',
    name: 'Mestre das Operações',
    description: 'Registrou 250 operações',
    icon: Crown,
    points: 750,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'operations_count', threshold: 250 } 
    }
  },
];

// ============ MILESTONE BADGES - VIP ============
const VIP_BADGES: Badge[] = [
  {
    id: 'vip_first',
    name: 'Primeira Entrada VIP',
    description: 'Registrou primeiro acesso a sala VIP',
    icon: DoorOpen,
    points: 100,
    category: 'milestone',
    rarity: 'common',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'vip_entries', threshold: 1 } 
    }
  },
  {
    id: 'vip_10',
    name: 'Viajante VIP',
    description: '10 acessos a salas VIP',
    icon: Map,
    points: 200,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'vip_entries', threshold: 10 } 
    }
  },
  {
    id: 'vip_25',
    name: 'VIP Frequente',
    description: '25 acessos a salas VIP',
    icon: Star,
    points: 400,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'vip_entries', threshold: 25 } 
    }
  },
];

// ============ MILESTONE BADGES - MILES BALANCE ============
const MILES_BALANCE_BADGES: Badge[] = [
  {
    id: 'miles_100k',
    name: '100 Mil Milhas',
    description: 'Acumulou 100.000 milhas',
    icon: Coins,
    points: 150,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'total_miles', threshold: 100000 } 
    }
  },
  {
    id: 'miles_500k',
    name: 'Meio Milhão',
    description: 'Acumulou 500.000 milhas',
    icon: Wallet,
    points: 300,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'total_miles', threshold: 500000 } 
    }
  },
  {
    id: 'miles_1m',
    name: 'Milionário',
    description: 'Acumulou 1.000.000 de milhas',
    icon: Landmark,
    points: 500,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'total_miles', threshold: 1000000 } 
    }
  },
  {
    id: 'miles_2_5m',
    name: 'Milionário Plus',
    description: 'Acumulou 2.500.000 de milhas',
    icon: Gem,
    points: 750,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'total_miles', threshold: 2500000 } 
    }
  },
  {
    id: 'miles_5m',
    name: 'Multi-Milionário',
    description: 'Acumulou 5.000.000 de milhas',
    icon: Crown,
    points: 1000,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'total_miles', threshold: 5000000 } 
    }
  },
];

// ============ MILESTONE BADGES - SAVINGS BY CATEGORY ============

// Helper to create savings badges for a category
const createSavingsBadges = (
  category: 'tickets' | 'hotels' | 'cars' | 'cruises' | 'insurances' | 'attractions' | 'transfers',
  namePrefix: string,
  icon: LucideIcon
): Badge[] => {
  const metricMap: Record<string, MilestoneMetric> = {
    tickets: 'savings_tickets',
    hotels: 'savings_hotels',
    cars: 'savings_cars',
    cruises: 'savings_cruises',
    insurances: 'savings_insurances',
    attractions: 'savings_attractions',
    transfers: 'savings_transfers',
  };

  const tiers = [
    { suffix: '1k', value: 1000, tier: 'Bronze', rarity: 'rare' as BadgeRarity, points: 150 },
    { suffix: '5k', value: 5000, tier: 'Prata', rarity: 'epic' as BadgeRarity, points: 250 },
    { suffix: '10k', value: 10000, tier: 'Ouro', rarity: 'epic' as BadgeRarity, points: 350 },
    { suffix: '15k', value: 15000, tier: 'Platina', rarity: 'legendary' as BadgeRarity, points: 450 },
    { suffix: '20k', value: 20000, tier: 'Diamante', rarity: 'legendary' as BadgeRarity, points: 550 },
    { suffix: '30k', value: 30000, tier: 'Master', rarity: 'legendary' as BadgeRarity, points: 750 },
  ];

  return tiers.map(tier => ({
    id: `savings_${category}_${tier.suffix}`,
    name: `${namePrefix} ${tier.tier}`,
    description: `Economizou R$${tier.value.toLocaleString('pt-BR')} em ${getCategoryLabel(category)}`,
    icon,
    points: tier.points,
    category: 'milestone' as BadgeCategory,
    rarity: tier.rarity,
    condition: {
      type: 'milestone' as const,
      milestone: { metric: metricMap[category], threshold: tier.value }
    }
  }));
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    tickets: 'passagens',
    hotels: 'hotéis',
    cars: 'aluguel de carros',
    cruises: 'cruzeiros',
    insurances: 'seguros viagem',
    attractions: 'atrações',
    transfers: 'transportes',
  };
  return labels[category] || category;
};

// Create savings badges for each category
const SAVINGS_TICKETS_BADGES = createSavingsBadges('tickets', 'Economista Aéreo', Plane);
const SAVINGS_HOTELS_BADGES = createSavingsBadges('hotels', 'Economista Hoteleiro', Hotel);
const SAVINGS_CARS_BADGES = createSavingsBadges('cars', 'Economista Rodoviário', Car);
const SAVINGS_CRUISES_BADGES = createSavingsBadges('cruises', 'Economista Marítimo', Ship);
const SAVINGS_INSURANCES_BADGES = createSavingsBadges('insurances', 'Economista de Seguros', ShieldCheck);
const SAVINGS_ATTRACTIONS_BADGES = createSavingsBadges('attractions', 'Economista de Passeios', Ticket);
const SAVINGS_TRANSFERS_BADGES = createSavingsBadges('transfers', 'Economista de Transfers', Bus);

// ============ MILESTONE BADGES - TOTAL SAVINGS ============
const TOTAL_SAVINGS_BADGES: Badge[] = [
  {
    id: 'savings_total_5k',
    name: 'Poupador Iniciante',
    description: 'Economizou R$5.000 no total',
    icon: PiggyBank,
    points: 200,
    category: 'milestone',
    rarity: 'rare',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'savings_total', threshold: 5000 } 
    }
  },
  {
    id: 'savings_total_15k',
    name: 'Poupador Estratégico',
    description: 'Economizou R$15.000 no total',
    icon: TrendingDown,
    points: 400,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'savings_total', threshold: 15000 } 
    }
  },
  {
    id: 'savings_total_30k',
    name: 'Poupador Avançado',
    description: 'Economizou R$30.000 no total',
    icon: Target,
    points: 600,
    category: 'milestone',
    rarity: 'epic',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'savings_total', threshold: 30000 } 
    }
  },
  {
    id: 'savings_total_50k',
    name: 'Poupador Expert',
    description: 'Economizou R$50.000 no total',
    icon: CircleDollarSign,
    points: 800,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'savings_total', threshold: 50000 } 
    }
  },
  {
    id: 'savings_total_100k',
    name: 'Poupador Master',
    description: 'Economizou R$100.000 no total',
    icon: Banknote,
    points: 1200,
    category: 'milestone',
    rarity: 'legendary',
    condition: { 
      type: 'milestone', 
      milestone: { metric: 'savings_total', threshold: 100000 } 
    }
  },
];

// ============ COMBINED MILESTONE BADGES ============
const MILESTONE_BADGES: Badge[] = [
  ...OPERATION_BADGES,
  ...MULTI_PROGRAM_BADGES,
  ...OPERATIONS_COUNT_BADGES,
  ...VIP_BADGES,
  ...MILES_BALANCE_BADGES,
  ...SAVINGS_TICKETS_BADGES,
  ...SAVINGS_HOTELS_BADGES,
  ...SAVINGS_CARS_BADGES,
  ...SAVINGS_CRUISES_BADGES,
  ...SAVINGS_INSURANCES_BADGES,
  ...SAVINGS_ATTRACTIONS_BADGES,
  ...SAVINGS_TRANSFERS_BADGES,
  ...TOTAL_SAVINGS_BADGES,
];

// ============ COMBINED BADGES ============
export const BADGES: Badge[] = [...ONBOARDING_BADGES, ...MILESTONE_BADGES];

export const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; glow: string }> = {
  common: {
    bg: 'from-slate-400 to-slate-500',
    border: 'border-slate-400',
    glow: 'shadow-slate-400/30'
  },
  rare: {
    bg: 'from-blue-400 to-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-400/40'
  },
  epic: {
    bg: 'from-violet-400 to-violet-600',
    border: 'border-violet-400',
    glow: 'shadow-violet-400/50'
  },
  legendary: {
    bg: 'from-amber-400 to-orange-500',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/60'
  }
};

export const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário'
};

// Helper to check if a metric is monetary (for UI formatting)
export const isMonetaryMetric = (metric: MilestoneMetric): boolean => {
  return metric.startsWith('savings_');
};
