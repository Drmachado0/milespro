import { Operation, ProgramBalance, Alert, Task, Holder, KPIData } from '@/types/miles';

export const holders: Holder[] = [
  { id: '1', name: 'Juliano', cpf: '123.456.789-00', email: 'juliano@email.com' },
  { id: '2', name: 'Maria', cpf: '987.654.321-00', email: 'maria@email.com' },
  { id: '3', name: 'Pedro', cpf: '456.789.123-00', email: 'pedro@email.com' },
];

export const operations: Operation[] = [
  {
    id: '1',
    date: '2025-11-01',
    type: 'Compra',
    program: 'Livelo',
    quantity: 50000,
    totalCost: 650,
    costPerThousand: 13,
    validity: '2027-11-01',
    status: 'Confirmado',
    holderId: '1',
    holderName: 'Juliano',
    creditCard: 'Itaú Platinum',
    installments: 3,
  },
  {
    id: '2',
    date: '2025-10-10',
    type: 'Venda',
    program: 'Smiles',
    quantity: 30000,
    totalCost: 0,
    costPerThousand: 0,
    validity: '2026-12-31',
    status: 'Recebido',
    holderId: '1',
    holderName: 'Juliano',
  },
  {
    id: '3',
    date: '2025-11-05',
    type: 'Transferência',
    program: 'Esfera',
    quantity: 40000,
    totalCost: 0,
    costPerThousand: 0,
    validity: '2027-11-05',
    status: 'Pendente',
    holderId: '2',
    holderName: 'Maria',
    bonus: 100,
  },
  {
    id: '4',
    date: '2025-11-15',
    type: 'Bumerangue',
    program: 'TudoAzul',
    quantity: 25000,
    totalCost: 312.50,
    costPerThousand: 12.50,
    validity: '2027-05-15',
    status: 'Confirmado',
    holderId: '1',
    holderName: 'Juliano',
  },
  {
    id: '5',
    date: '2025-11-20',
    type: 'Compra Turbinada',
    program: 'Livelo',
    quantity: 80000,
    totalCost: 880,
    costPerThousand: 11,
    validity: '2027-11-20',
    status: 'Confirmado',
    holderId: '3',
    holderName: 'Pedro',
    bonus: 50,
  },
];

export const programBalances: ProgramBalance[] = [
  { program: 'Livelo', balance: 350000, value: 5250, averageCost: 13.5, expiringSoon: 20000, expiryDate: '2025-12-25' },
  { program: 'Esfera', balance: 200000, value: 2800, averageCost: 14, expiringSoon: 0 },
  { program: 'Smiles', balance: 300000, value: 4200, averageCost: 14, expiringSoon: 50000, expiryDate: '2026-01-15' },
  { program: 'TudoAzul', balance: 250000, value: 3500, averageCost: 14, expiringSoon: 30000, expiryDate: '2026-02-28' },
  { program: 'Latam', balance: 150000, value: 2100, averageCost: 14, expiringSoon: 20000, expiryDate: '2026-03-10' },
];

export const alerts: Alert[] = [
  {
    id: '1',
    title: 'Milhas a vencer em 30 dias',
    description: '20.000 Livelo vencem em 25/12/2025',
    type: 'warning',
    date: '2025-12-25',
  },
  {
    id: '2',
    title: 'Promoção de transferência 100%',
    description: 'Livelo → Latam até 30/11',
    type: 'promo',
  },
  {
    id: '3',
    title: 'Recebimento futuro',
    description: 'R$ 1.200,00 em 05/12/2025',
    type: 'success',
    date: '2025-12-05',
  },
  {
    id: '4',
    title: 'Compra bonificada Esfera',
    description: '80% de bônus até 28/11',
    type: 'promo',
  },
];

export const tasks: Task[] = [
  {
    id: '1',
    title: 'Emitir passagem Latam',
    description: 'Viagem para São Paulo - 15k milhas',
    dueDate: '2025-11-30',
    completed: false,
    priority: 'high',
  },
  {
    id: '2',
    title: 'Renovar clube Livelo',
    description: 'Assinatura vence em dezembro',
    dueDate: '2025-12-05',
    completed: false,
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Transferir milhas Esfera',
    description: 'Aproveitar promoção 100%',
    dueDate: '2025-11-30',
    completed: false,
    priority: 'high',
  },
  {
    id: '4',
    title: 'Verificar extrato Smiles',
    description: 'Conferir milhas recebidas',
    dueDate: '2025-12-10',
    completed: true,
    priority: 'low',
  },
];

export const kpiData: KPIData = {
  totalMiles: 1250000,
  totalValue: 17850,
  averageCost: 14.20,
  expiringIn90Days: 120000,
  monthlyProfit: 2350,
};

export const programDistributionData = [
  { name: 'Livelo', value: 350000, fill: 'hsl(var(--chart-1))' },
  { name: 'Esfera', value: 200000, fill: 'hsl(var(--chart-2))' },
  { name: 'Smiles', value: 300000, fill: 'hsl(var(--chart-3))' },
  { name: 'TudoAzul', value: 250000, fill: 'hsl(var(--chart-4))' },
  { name: 'Latam', value: 150000, fill: 'hsl(var(--chart-5))' },
];

export const costEvolutionData = [
  { date: 'Set', cost: 15.2 },
  { date: 'Out', cost: 14.5 },
  { date: 'Nov 01', cost: 14.0 },
  { date: 'Nov 10', cost: 13.8 },
  { date: 'Nov 20', cost: 13.2 },
  { date: 'Nov 27', cost: 13.0 },
];

export const monthlyOperationsData = [
  { month: 'Jun', compras: 45000, vendas: 20000, transferencias: 30000 },
  { month: 'Jul', compras: 60000, vendas: 35000, transferencias: 25000 },
  { month: 'Ago', compras: 55000, vendas: 40000, transferencias: 20000 },
  { month: 'Set', compras: 70000, vendas: 30000, transferencias: 45000 },
  { month: 'Out', compras: 80000, vendas: 50000, transferencias: 35000 },
  { month: 'Nov', compras: 95000, vendas: 45000, transferencias: 40000 },
];
