import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { format, subMonths, subDays, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = '30d' | '90d' | '6m' | '1a' | 'all';

interface CostEvolutionDataPoint {
  date: string;
  cost: number;
}

interface MonthlyOperationsDataPoint {
  month: string;
  compras: number;
  vendas: number;
  transferencias: number;
}

interface BestCost {
  cost: number;
  program: string;
  date: string;
}

export function useOperationsAnalytics(programFilter?: string, periodFilter: PeriodFilter = 'all') {
  const { user } = useAuth();
  const { isFree, historyStartDate } = useSubscription();

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations-analytics', user?.id, isFree, historyStartDate],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id) // Explicit filter for defense in depth
        .eq('status', 'confirmado')
        .order('date', { ascending: true });
      
      // Apply 30-day history filter for free plan users
      if (isFree && historyStartDate) {
        query = query.gte('created_at', historyStartDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get period start date based on filter
  const periodStartDate = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case '30d':
        return subDays(now, 30);
      case '90d':
        return subDays(now, 90);
      case '6m':
        return subMonths(now, 6);
      case '1a':
        return subYears(now, 1);
      default:
        return null;
    }
  }, [periodFilter]);

  // Calculate cost evolution (average cost per month)
  const costEvolutionData = useMemo<CostEvolutionDataPoint[]>(() => {
    const monthlyData = new Map<string, { totalCost: number; totalQuantity: number }>();
    
    operations.forEach((op) => {
      if (op.type === 'compra' || op.type === 'compra_turbinada' || op.type === 'bumerangue') {
        // Apply program filter if specified
        if (programFilter && programFilter !== 'all' && op.program !== programFilter) {
          return;
        }
        // Apply period filter
        if (periodStartDate && new Date(op.date) < periodStartDate) {
          return;
        }
        if (op.total_cost && op.total_cost > 0 && op.quantity > 0) {
          const monthKey = format(new Date(op.date), 'dd/MM/yyyy', { locale: ptBR });
          const current = monthlyData.get(monthKey) || { totalCost: 0, totalQuantity: 0 };
          current.totalCost += op.total_cost;
          current.totalQuantity += op.quantity;
          monthlyData.set(monthKey, current);
        }
      }
    });

    const result: CostEvolutionDataPoint[] = [];
    monthlyData.forEach((data, month) => {
      const avgCost = (data.totalCost / data.totalQuantity) * 1000;
      result.push({
        date: month,
        cost: Number(avgCost.toFixed(2)),
      });
    });

    // Sort by date
    result.sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/').map(Number);
      const [dayB, monthB, yearB] = b.date.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [operations, programFilter, periodStartDate]);

  // Calculate monthly operations volume
  const monthlyOperationsData = useMemo<MonthlyOperationsDataPoint[]>(() => {
    const last6Months: MonthlyOperationsDataPoint[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMM', { locale: ptBR });

      let compras = 0;
      let vendas = 0;
      let transferencias = 0;

      operations.forEach((op) => {
        const opDate = new Date(op.date);
        if (opDate >= monthStart && opDate <= monthEnd) {
          if (op.type === 'compra' || op.type === 'compra_turbinada' || op.type === 'entrada_manual' || op.type === 'bumerangue') {
            compras += op.quantity;
          } else if (op.type === 'venda' || op.type === 'resgate') {
            vendas += op.quantity;
          } else if (op.type === 'transferencia') {
            transferencias += op.quantity;
          }
        }
      });

      last6Months.push({
        month: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
        compras,
        vendas,
        transferencias,
      });
    }

    return last6Months;
  }, [operations]);

  // Find best cost (lowest cost per thousand)
  const bestCost = useMemo<BestCost | null>(() => {
    let best: BestCost | null = null;

    operations.forEach((op) => {
      if ((op.type === 'compra' || op.type === 'compra_turbinada' || op.type === 'bumerangue') && 
          op.cost_per_thousand && op.cost_per_thousand > 0) {
        if (!best || op.cost_per_thousand < best.cost) {
          best = {
            cost: op.cost_per_thousand,
            program: op.program,
            date: format(new Date(op.date), 'MMM/yy', { locale: ptBR }),
          };
        }
      }
    });

    return best;
  }, [operations]);

  // Get unique programs from operations
  const availablePrograms = useMemo(() => {
    const programSet = new Set<string>();
    operations.forEach((op) => {
      if (op.type === 'compra' || op.type === 'compra_turbinada' || op.type === 'bumerangue') {
        if (op.total_cost && op.total_cost > 0 && op.quantity > 0) {
          programSet.add(op.program);
        }
      }
    });
    return Array.from(programSet).sort();
  }, [operations]);

  return {
    costEvolutionData,
    monthlyOperationsData,
    bestCost,
    availablePrograms,
    isLoading,
  };
}
