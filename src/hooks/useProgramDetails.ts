import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';

export interface ProgramOperation {
  id: string;
  date: string;
  type: string;
  quantity: number;
  totalCost: number;
  costPerThousand: number;
  origin: string;
  notes: string;
  holderName: string;
  status: string;
}

export interface ProgramDetails {
  program: string;
  balance: number;
  averageCost: number;
  totalInvested: number;
  estimatedValue: number;
  roi: number;
  marketPrice: number;
  economyFromEmissions: number;
  operations: ProgramOperation[];
  costEvolution: { date: string; cost: number; type: string }[];
  monthlyOperations: { month: string; compras: number; vendas: number; transferencias: number; emissoes: number }[];
  iqc: number; // Index Quality Cost
  salePotential: number;
  expiringMiles: number;
  expiryDate: string | null;
}

const MARKET_PRICE = 20; // R$/mil default

export function useProgramDetails(programName: string, holderId?: string) {
  const { user } = useAuth();

  const { data: operations, isLoading } = useQuery({
    queryKey: ['program-details', programName, user?.id, holderId],
    queryFn: async () => {
      let query = supabase
        .from('operations')
        .select('*')
        .eq('program', programName);
      
      if (holderId) {
        query = query.eq('holder_id', holderId);
      }
      
      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!programName,
  });

  const details = useMemo<ProgramDetails | null>(() => {
    if (!operations) return null;

    const ADDING_OPERATIONS = ['compra', 'entrada_manual', 'compra_turbinada', 'bumerangue'];
    const SUBTRACTING_OPERATIONS = ['venda', 'transferencia', 'resgate'];

    let balance = 0;
    let totalInvested = 0;
    let totalQuantityPurchased = 0;
    let economyFromEmissions = 0;

    const formattedOperations: ProgramOperation[] = [];
    const costEvolution: { date: string; cost: number; type: string }[] = [];

    operations.forEach((op) => {
      const qty = op.quantity || 0;
      const cost = op.total_cost || 0;

      if (ADDING_OPERATIONS.includes(op.type)) {
        balance += qty;
        totalInvested += cost;
        totalQuantityPurchased += qty;
      } else if (SUBTRACTING_OPERATIONS.includes(op.type)) {
        balance -= qty;
        if (op.type === 'venda') {
          totalInvested -= cost; // Venda retorna dinheiro
        }
      }

      // Track emissions savings
      if (op.type === 'resgate') {
        // Estimate savings: milhas usadas * preço mercado - taxas pagas
        const marketValue = (qty / 1000) * MARKET_PRICE;
        economyFromEmissions += marketValue - cost;
      }

      // Cost evolution tracking
      if (ADDING_OPERATIONS.includes(op.type) && op.cost_per_thousand) {
        costEvolution.push({
          date: op.date,
          cost: op.cost_per_thousand,
          type: op.type,
        });
      }

      formattedOperations.push({
        id: op.id,
        date: op.date,
        type: op.type,
        quantity: qty,
        totalCost: cost,
        costPerThousand: op.cost_per_thousand || 0,
        origin: op.notes || '',
        notes: op.notes || '',
        holderName: op.holder_name || '',
        status: op.status,
      });
    });

    // Ensure balance is not negative
    balance = Math.max(0, balance);

    // Calculate average cost
    const averageCost = totalQuantityPurchased > 0 
      ? (totalInvested / totalQuantityPurchased) * 1000 
      : 0;

    // Calculate estimated value
    const estimatedValue = (balance / 1000) * MARKET_PRICE;

    // Calculate ROI
    const roi = totalInvested > 0 
      ? ((estimatedValue - totalInvested) / totalInvested) * 100 
      : 0;

    // Calculate IQC (Index Quality Cost) - ratio of average cost to market price
    const iqc = MARKET_PRICE > 0 ? (averageCost / MARKET_PRICE) * 100 : 0;

    // Sale potential (profit/loss if selling everything)
    const salePotential = estimatedValue - totalInvested;

    // Monthly operations aggregation
    const monthlyMap = new Map<string, { compras: number; vendas: number; transferencias: number; emissoes: number }>();
    
    operations.forEach((op) => {
      const monthKey = op.date.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthKey) || { compras: 0, vendas: 0, transferencias: 0, emissoes: 0 };
      
      if (['compra', 'compra_turbinada', 'bumerangue', 'entrada_manual'].includes(op.type)) {
        existing.compras += op.quantity || 0;
      } else if (op.type === 'venda') {
        existing.vendas += op.quantity || 0;
      } else if (op.type === 'transferencia') {
        existing.transferencias += op.quantity || 0;
      } else if (op.type === 'resgate') {
        existing.emissoes += op.quantity || 0;
      }
      
      monthlyMap.set(monthKey, existing);
    });

    const monthlyOperations = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return {
      program: programName,
      balance,
      averageCost: parseFloat(averageCost.toFixed(2)),
      totalInvested,
      estimatedValue,
      roi,
      marketPrice: MARKET_PRICE,
      economyFromEmissions,
      operations: formattedOperations.reverse(), // Most recent first
      costEvolution,
      monthlyOperations,
      iqc,
      salePotential,
      expiringMiles: 0, // Would need expiry tracking
      expiryDate: null,
    };
  }, [operations, programName]);

  return { details, isLoading };
}
