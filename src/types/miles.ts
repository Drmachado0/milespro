// Program type is now a string to support all 74+ programs dynamically
export type Program = string;

export type OperationType = 
  | 'Compra' 
  | 'Venda' 
  | 'Transferência' 
  | 'Bumerangue' 
  | 'Entrada Manual' 
  | 'Compra Turbinada'
  | 'Resgate';

export type OperationStatus = 'Confirmado' | 'Pendente' | 'Recebido' | 'Cancelado';

export interface Holder {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
}

export interface Operation {
  id: string;
  date: string;
  type: OperationType;
  program: Program;
  quantity: number;
  totalCost: number;
  costPerThousand: number;
  validity: string;
  status: OperationStatus;
  holderId: string;
  holderName: string;
  notes?: string;
  creditCard?: string;
  installments?: number;
  bonus?: number;
}

export interface ProgramBalance {
  program: Program;
  balance: number;
  value: number;
  averageCost: number;
  expiringSoon: number;
  expiryDate?: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'info' | 'success' | 'promo';
  date?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface KPIData {
  totalMiles: number;
  totalValue: number;
  averageCost: number;
  expiringIn90Days: number;
  monthlyProfit: number;
}
