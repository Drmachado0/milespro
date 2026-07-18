import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  PiggyBank, 
  Crown, 
  Bell, 
  Plus,
  LayoutDashboard,
  Trophy
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface TourTooltip {
  id: string;
  targetSelector: string;
  message: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  targetElement?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: 'navigate' | 'highlight' | 'complete';
  tooltips?: TourTooltip[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Miles Pro! 🎉',
    description: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades e configurar sua conta. Leva apenas 2 minutos!',
    icon: LayoutDashboard,
    path: '/dashboard',
    position: 'center',
    action: 'navigate'
  },
  {
    id: 'holders',
    title: 'Cadastre seus Titulares',
    description: 'Titulares são as pessoas que acumulam milhas (você, familiares, etc). Cadastre cada titular para organizar seus pontos separadamente.',
    icon: Users,
    path: '/titulares',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'holders-add-btn',
        targetSelector: '[data-tour="add-holder"]',
        message: 'Clique aqui para cadastrar seu primeiro titular',
        position: 'bottom'
      },
      {
        id: 'holders-list',
        targetSelector: '[data-tour="holders-list"]',
        message: 'Seus titulares aparecerão aqui com estatísticas detalhadas',
        position: 'left'
      }
    ]
  },
  {
    id: 'cards',
    title: 'Adicione seus Cartões',
    description: 'Cadastre seus cartões de crédito para rastrear transferências de pontos e controlar o acesso às salas VIP.',
    icon: CreditCard,
    path: '/gestao/cartoes',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'cards-add-btn',
        targetSelector: '[data-tour="add-card"]',
        message: 'Adicione seus cartões de crédito aqui',
        position: 'bottom'
      },
      {
        id: 'cards-list',
        targetSelector: '[data-tour="cards-list"]',
        message: 'Veja e gerencie todos os seus cartões',
        position: 'top'
      }
    ]
  },
  {
    id: 'prices',
    title: 'Configure Preços de Referência',
    description: 'Defina os preços de compra e venda de cada programa para calcular automaticamente seu lucro e ROI.',
    icon: TrendingUp,
    path: '/gestao/precos-programas',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'prices-input',
        targetSelector: '[data-tour="price-input"]',
        message: 'Defina seu preço de referência por milheiro',
        position: 'right'
      },
      {
        id: 'prices-save',
        targetSelector: '[data-tour="save-prices"]',
        message: 'Salve suas alterações aqui',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'balance',
    title: 'Registre seu Saldo Inicial',
    description: 'Informe quantos pontos você já possui em cada programa. Isso serve como ponto de partida para seus cálculos.',
    icon: PiggyBank,
    path: '/lancamentos/entrada',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'balance-program',
        targetSelector: '[data-tour="select-program"]',
        message: 'Escolha o programa de fidelidade',
        position: 'bottom'
      },
      {
        id: 'balance-quantity',
        targetSelector: '[data-tour="input-quantity"]',
        message: 'Informe a quantidade de pontos que você já tem',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'club',
    title: 'Clubes de Assinatura',
    description: 'Se você assina clubes como Livelo, Smiles ou outros, cadastre aqui para acompanhar seus pontos mensais e projeções.',
    icon: Crown,
    path: '/gestao/clube-assinante',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'club-add-btn',
        targetSelector: '[data-tour="add-subscription"]',
        message: 'Cadastre suas assinaturas de clubes de milhas',
        position: 'bottom'
      },
      {
        id: 'club-kpis',
        targetSelector: '[data-tour="club-kpis"]',
        message: 'Acompanhe o custo mensal e pontos acumulados',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'alerts',
    title: 'Configure seus Alertas',
    description: 'Crie alertas de preço para ser notificado quando o milheiro atingir seu valor alvo de compra ou venda.',
    icon: Bell,
    path: '/alertas',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'alerts-tabs',
        targetSelector: '[data-tour="alerts-tabs"]',
        message: 'Navegue entre promoções, alertas de preço e vencimentos',
        position: 'bottom'
      },
      {
        id: 'alerts-settings',
        targetSelector: '[data-tour="alerts-settings"]',
        message: 'Configure suas preferências de notificação',
        position: 'left'
      }
    ]
  },
  {
    id: 'first_operation',
    title: 'Registre sua Primeira Operação',
    description: 'Agora você está pronto! Registre compras, vendas e transferências para acompanhar seu portfólio em tempo real.',
    icon: Plus,
    path: '/operacoes/visao-geral',
    position: 'center',
    action: 'navigate',
    tooltips: [
      {
        id: 'operations-filters',
        targetSelector: '[data-tour="operations-filters"]',
        message: 'Use os filtros para encontrar operações específicas',
        position: 'bottom'
      },
      {
        id: 'operations-table',
        targetSelector: '[data-tour="operations-table"]',
        message: 'Todas as suas operações aparecerão nesta tabela',
        position: 'top'
      }
    ]
  },
  {
    id: 'complete',
    title: 'Tour Concluído! 🏆',
    description: 'Parabéns! Você conheceu as principais funcionalidades do Miles Pro. Explore à vontade e desbloqueie conquistas conforme usa o sistema.',
    icon: Trophy,
    path: '/dashboard',
    position: 'center',
    action: 'complete'
  }
];

export const TOTAL_TOUR_STEPS = TOUR_STEPS.length;
