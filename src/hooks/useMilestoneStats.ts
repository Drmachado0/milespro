import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavingsByCategory {
  tickets: number;
  hotels: number;
  cars: number;
  cruises: number;
  insurances: number;
  attractions: number;
  transfers: number;
}

export interface MilestoneStats {
  operationsCount: number;
  operationsByType: Record<string, number>;
  vipEntriesCount: number;
  programsWithBalance: number;
  totalMilesBalance: number;
  savingsTotal: number;
  savingsByCategory: SavingsByCategory;
}

const DEFAULT_STATS: MilestoneStats = {
  operationsCount: 0,
  operationsByType: {},
  vipEntriesCount: 0,
  programsWithBalance: 0,
  totalMilesBalance: 0,
  savingsTotal: 0,
  savingsByCategory: {
    tickets: 0,
    hotels: 0,
    cars: 0,
    cruises: 0,
    insurances: 0,
    attractions: 0,
    transfers: 0,
  },
};

export function useMilestoneStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['milestone-stats', user?.id],
    queryFn: async (): Promise<MilestoneStats> => {
      if (!user?.id) return DEFAULT_STATS;

      // Fetch all stats in parallel
      const [
        operationsResult,
        vipEntriesResult,
        balancesResult,
        ticketsResult,
        hotelsResult,
        carsResult,
        cruisesResult,
        insurancesResult,
        attractionsResult,
        transfersResult,
      ] = await Promise.all([
        // Operations count and by type
        supabase
          .from('operations')
          .select('type')
          .eq('user_id', user.id),
        
        // VIP entries count
        supabase
          .from('vip_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        
        // Program balances
        supabase
          .from('program_balances')
          .select('balance, average_cost')
          .eq('user_id', user.id)
          .gt('balance', 0),
        
        // Travel tickets savings (cash_price - total_cost_brl)
        supabase
          .from('travel_tickets')
          .select('cash_price, total_cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        
        // Hotel reservations savings
        supabase
          .from('travel_hotel_reservations')
          .select('cash_price, total_cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        
        // Car rentals savings
        supabase
          .from('travel_car_rentals')
          .select('cash_price, total_cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        
        // Cruises savings
        supabase
          .from('travel_cruises')
          .select('cash_price, total_cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        
        // Insurances savings (accumulation model: miles value)
        supabase
          .from('travel_insurances')
          .select('cost_brl, miles_earned, mile_value_per_thousand')
          .eq('user_id', user.id)
          .eq('status', 'Ativo'),
        
        // Attractions savings
        supabase
          .from('travel_attractions')
          .select('cash_price, cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        
        // Transfers savings
        supabase
          .from('travel_transfers')
          .select('cash_price, total_cost_brl')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
      ]);

      // Calculate operations by type
      const operationsByType: Record<string, number> = {};
      if (operationsResult.data) {
        for (const op of operationsResult.data) {
          operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
        }
      }

      // Calculate totals from balances
      let totalMilesBalance = 0;
      
      if (balancesResult.data) {
        for (const balance of balancesResult.data) {
          totalMilesBalance += balance.balance || 0;
        }
      }

      // Calculate savings for each category
      const calculateSavings = (
        data: { cash_price: number | null; total_cost_brl?: number | null; cost_brl?: number | null }[] | null
      ): number => {
        if (!data) return 0;
        return data.reduce((sum, item) => {
          const cashPrice = item.cash_price || 0;
          const cost = item.total_cost_brl ?? item.cost_brl ?? 0;
          const savings = cashPrice - cost;
          return sum + Math.max(0, savings); // Only count positive savings
        }, 0);
      };

      // Calculate insurance savings (accumulation model: miles value)
      const calculateInsuranceSavings = (
        data: { cost_brl: number | null; miles_earned: number | null; mile_value_per_thousand: number | null }[] | null
      ): number => {
        if (!data) return 0;
        return data.reduce((sum, item) => {
          const milesEarned = item.miles_earned || 0;
          const mileValuePerK = item.mile_value_per_thousand || 35;
          const milesValue = (milesEarned / 1000) * mileValuePerK;
          return sum + Math.max(0, milesValue);
        }, 0);
      };

      const savingsByCategory: SavingsByCategory = {
        tickets: calculateSavings(ticketsResult.data),
        hotels: calculateSavings(hotelsResult.data),
        cars: calculateSavings(carsResult.data),
        cruises: calculateSavings(cruisesResult.data),
        insurances: calculateInsuranceSavings(insurancesResult.data),
        attractions: calculateSavings(attractionsResult.data),
        transfers: calculateSavings(transfersResult.data),
      };

      const savingsTotal = Object.values(savingsByCategory).reduce((sum, val) => sum + val, 0);

      return {
        operationsCount: operationsResult.data?.length || 0,
        operationsByType,
        vipEntriesCount: vipEntriesResult.count || 0,
        programsWithBalance: balancesResult.data?.length || 0,
        totalMilesBalance,
        savingsTotal,
        savingsByCategory,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: stats || DEFAULT_STATS,
    isLoading,
  };
}
