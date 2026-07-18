import { Users, CreditCard, Coins, ArrowDownToLine, Crown, Bell, Zap, Sparkles, LucideIcon } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  optional: boolean;
  order: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'holders',
    title: 'Cadastrar Titulares',
    description: 'Registre quem são os donos das milhas (você, família, clientes)',
    path: '/titulares',
    icon: Users,
    optional: false,
    order: 1,
  },
  {
    id: 'cards',
    title: 'Adicionar Cartões',
    description: 'Cadastre seus cartões de crédito para controlar gastos e milhas',
    path: '/gestao/cartoes',
    icon: CreditCard,
    optional: false,
    order: 2,
  },
  {
    id: 'prices',
    title: 'Definir Preços de Referência',
    description: 'Configure o custo médio por milheiro para cada programa',
    path: '/gestao/precos-programas',
    icon: Coins,
    optional: false,
    order: 3,
  },
  {
    id: 'balance',
    title: 'Registrar Saldo Inicial',
    description: 'Entre com seu saldo atual de milhas para começar o controle',
    path: '/lancamentos/entrada',
    icon: ArrowDownToLine,
    optional: false,
    order: 4,
  },
  {
    id: 'club',
    title: 'Assinaturas de Clubes',
    description: 'Cadastre clubes como Livelo, Esfera para controle de bônus',
    path: '/gestao/clube-assinante',
    icon: Crown,
    optional: true,
    order: 5,
  },
  {
    id: 'alerts',
    title: 'Configurar Alertas',
    description: 'Personalize notificações de promoções e vencimentos',
    path: '/alertas',
    icon: Bell,
    optional: true,
    order: 6,
  },
  {
    id: 'first_operation',
    title: 'Primeira Operação',
    description: 'Registre sua primeira compra, venda ou transferência de milhas',
    path: '/operacoes/visao-geral',
    icon: Zap,
    optional: true,
    order: 7,
  },
  {
    id: 'vip_quota',
    title: 'Cota de Sala VIP',
    description: 'Configure cotas de sala VIP nos seus cartões',
    path: '/gestao/cartoes',
    icon: Sparkles,
    optional: true,
    order: 8,
  },
];

export const REQUIRED_STEPS = ONBOARDING_STEPS.filter(step => !step.optional);
export const OPTIONAL_STEPS = ONBOARDING_STEPS.filter(step => step.optional);
