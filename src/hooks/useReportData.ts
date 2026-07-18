import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computeTotalBalance } from '@/lib/computeBalances';

export type ReportType = 'operations' | 'balance' | 'financial' | 'tax';

export interface ReportFilters {
  type: ReportType;
  holderId: string;
  programId: string;
  startDate: string;
  endDate: string;
  applyHistoryLimit?: boolean;
}

export interface OperationsReportRow {
  date: string;
  type: string;
  program: string;
  holder: string;
  quantity: number;
  totalCost: number;
  costPerThousand: number;
  status: string;
}

export interface BalanceReportRow {
  program: string;
  holder: string;
  balance: number;
  averageCost: number;
  totalInvested: number;
  estimatedValue: number;
}

export interface FinancialReportRow {
  month: string;
  purchases: number;
  sales: number;
  netFlow: number;
  totalOperations: number;
}

export interface TaxReportRow {
  program: string;
  totalPurchased: number;
  totalSold: number;
  totalCost: number;
  totalRevenue: number;
  result: number;
}

const typeLabels: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  transferencia: 'Transferência',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
  compra_turbinada: 'Compra Turbinada',
  resgate: 'Resgate',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

export function useReportData(filters: ReportFilters) {
  const { user } = useAuth();
  const { isFree, historyStartDate } = useSubscription();

  // Apply history limit for free users if not explicitly overridden
  const effectiveHistoryLimit = filters.applyHistoryLimit !== false && isFree && historyStartDate;

  // Fetch operations - include user.id in queryKey to prevent cross-user cache issues
  const { data: operations = [], isLoading: loadingOperations } = useQuery({
    queryKey: ['report-operations', user?.id, filters, effectiveHistoryLimit, historyStartDate],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Apply history filter for free plan users
      if (effectiveHistoryLimit && historyStartDate) {
        query = query.gte('created_at', historyStartDate);
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.holderId && filters.holderId !== 'all') {
        query = query.eq('holder_id', filters.holderId);
      }
      if (filters.programId && filters.programId !== 'all') {
        query = query.eq('program', filters.programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch holders - include user.id in queryKey
  const { data: holders = [] } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('holders')
        .select('*')
        .eq('user_id', user.id) // Explicit filter for defense in depth
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Process Operations Report
  const operationsReport = useMemo<OperationsReportRow[]>(() => {
    return operations.map((op) => ({
      date: format(parseISO(op.date), 'dd/MM/yyyy'),
      type: typeLabels[op.type] || op.type,
      program: op.program,
      holder: op.holder_name || '-',
      quantity: op.quantity,
      totalCost: op.total_cost || 0,
      costPerThousand: op.cost_per_thousand || 0,
      status: statusLabels[op.status] || op.status,
    }));
  }, [operations]);

  // Process Balance Report
  const balanceReport = useMemo<BalanceReportRow[]>(() => {
    const balanceMap = new Map<string, {
      balance: number;
      totalInvested: number;
      totalQuantity: number;
      holder: string;
    }>();

    const addingTypes = ['compra', 'compra_turbinada', 'entrada_manual', 'bumerangue'];
    const subtractingTypes = ['venda', 'resgate'];

    operations
      .filter(op => op.status === 'confirmado')
      .forEach((op) => {
        const key = `${op.program}-${op.holder_name || 'Sem Titular'}`;
        const current = balanceMap.get(key) || {
          balance: 0,
          totalInvested: 0,
          totalQuantity: 0,
          holder: op.holder_name || 'Sem Titular',
        };

        if (addingTypes.includes(op.type)) {
          current.balance += op.quantity;
          if (op.total_cost && op.total_cost > 0) {
            current.totalInvested += op.total_cost;
            current.totalQuantity += op.quantity;
          }
        } else if (subtractingTypes.includes(op.type)) {
          current.balance -= op.quantity;
        } else if (op.type === 'transferencia') {
          current.balance -= op.quantity;
        }

        balanceMap.set(key, current);
      });

    const result: BalanceReportRow[] = [];
    balanceMap.forEach((data, key) => {
      const [program] = key.split('-');
      const averageCost = data.totalQuantity > 0 
        ? (data.totalInvested / data.totalQuantity) * 1000 
        : 0;
      const marketPrice = 35; // R$ 35/mil como referência
      
      result.push({
        program,
        holder: data.holder,
        balance: Math.max(0, data.balance),
        averageCost: Number(averageCost.toFixed(2)),
        totalInvested: data.totalInvested,
        estimatedValue: (Math.max(0, data.balance) / 1000) * marketPrice,
      });
    });

    return result.sort((a, b) => b.balance - a.balance);
  }, [operations]);

  // Process Financial Report
  const financialReport = useMemo<FinancialReportRow[]>(() => {
    const monthMap = new Map<string, {
      purchases: number;
      sales: number;
      totalOperations: number;
    }>();

    operations.forEach((op) => {
      const monthKey = format(parseISO(op.date), 'yyyy-MM');
      const current = monthMap.get(monthKey) || {
        purchases: 0,
        sales: 0,
        totalOperations: 0,
      };

      current.totalOperations += 1;

      if (['compra', 'compra_turbinada', 'bumerangue'].includes(op.type)) {
        current.purchases += op.total_cost || 0;
      } else if (op.type === 'venda') {
        current.sales += op.total_cost || 0;
      }

      monthMap.set(monthKey, current);
    });

    const result: FinancialReportRow[] = [];
    monthMap.forEach((data, monthKey) => {
      result.push({
        month: format(parseISO(`${monthKey}-01`), 'MMM/yyyy', { locale: ptBR }),
        purchases: data.purchases,
        sales: data.sales,
        netFlow: data.sales - data.purchases,
        totalOperations: data.totalOperations,
      });
    });

    return result.sort((a, b) => b.month.localeCompare(a.month));
  }, [operations]);

  // Process Tax Report
  const taxReport = useMemo<TaxReportRow[]>(() => {
    const programMap = new Map<string, {
      totalPurchased: number;
      totalSold: number;
      totalCost: number;
      totalRevenue: number;
    }>();

    operations
      .filter(op => op.status === 'confirmado')
      .forEach((op) => {
        const current = programMap.get(op.program) || {
          totalPurchased: 0,
          totalSold: 0,
          totalCost: 0,
          totalRevenue: 0,
        };

        if (['compra', 'compra_turbinada', 'bumerangue'].includes(op.type)) {
          current.totalPurchased += op.quantity;
          current.totalCost += op.total_cost || 0;
        } else if (op.type === 'venda') {
          current.totalSold += op.quantity;
          current.totalRevenue += op.total_cost || 0;
        }

        programMap.set(op.program, current);
      });

    const result: TaxReportRow[] = [];
    programMap.forEach((data, program) => {
      result.push({
        program,
        totalPurchased: data.totalPurchased,
        totalSold: data.totalSold,
        totalCost: data.totalCost,
        totalRevenue: data.totalRevenue,
        result: data.totalRevenue - data.totalCost,
      });
    });

    return result.sort((a, b) => b.result - a.result);
  }, [operations]);

  // Summary stats
  const summary = useMemo(() => {
    const totalOperations = operations.length;
    const totalPurchases = operations
      .filter(op => ['compra', 'compra_turbinada', 'bumerangue'].includes(op.type))
      .reduce((sum, op) => sum + (op.total_cost || 0), 0);
    const totalSales = operations
      .filter(op => op.type === 'venda')
      .reduce((sum, op) => sum + (op.total_cost || 0), 0);

    // QA audit sas.txt Bug 3 — totalMiles previously had its own inline
    // reducer that DID NOT subtract transferencia, while useProgramBalances
    // DID. The Dashboard and the Relatórios summary therefore disagreed by
    // exactly the total volume of outbound transfers. Routing through the
    // shared computeTotalBalance reducer guarantees the same value lands
    // on every surface.
    const totalMiles = computeTotalBalance(operations);

    return {
      totalOperations,
      totalPurchases,
      totalSales,
      totalMiles,
      netResult: totalSales - totalPurchases,
    };
  }, [operations]);

  return {
    operationsReport,
    balanceReport,
    financialReport,
    taxReport,
    summary,
    holders,
    isLoading: loadingOperations,
    isHistoryLimited: !!effectiveHistoryLimit,
  };
}
