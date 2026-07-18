import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

export interface SubscriptionHistoryEntry {
  id: string;
  user_id: string;
  subscription_id: string;
  month_year: string;
  points_generated: number;
  bonus_generated: number;
  amount_paid: number;
  cost_per_thousand: number | null;
  created_at: string;
}

export interface MonthlyEvolutionData {
  month: string;
  monthLabel: string;
  points: number;
  bonus: number;
  total: number;
  cost: number;
  costPerThousand: number;
}

export function useSubscriptionHistory(subscriptionId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch history for a specific subscription or all
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['subscription_history', subscriptionId],
    queryFn: async () => {
      let query = supabase
        .from('subscription_history')
        .select('*')
        .order('month_year', { ascending: true });
      
      if (subscriptionId) {
        query = query.eq('subscription_id', subscriptionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SubscriptionHistoryEntry[];
    },
    enabled: !!user,
  });

  // Add history entry
  const addHistoryEntry = useMutation({
    mutationFn: async (data: {
      subscription_id: string;
      month_year: string;
      points_generated: number;
      bonus_generated: number;
      amount_paid: number;
      cost_per_thousand?: number;
    }) => {
      const { error } = await supabase
        .from('subscription_history')
        .upsert({
          user_id: user!.id,
          subscription_id: data.subscription_id,
          month_year: data.month_year,
          points_generated: data.points_generated,
          bonus_generated: data.bonus_generated,
          amount_paid: data.amount_paid,
          cost_per_thousand: data.cost_per_thousand || null,
        }, {
          onConflict: 'subscription_id,month_year',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription_history'] });
      toast.success('Histórico atualizado!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Get monthly evolution data for chart
  const getMonthlyEvolution = (months: number = 12): MonthlyEvolutionData[] => {
    const monthlyData = new Map<string, MonthlyEvolutionData>();
    
    // Initialize with last N months
    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      monthlyData.set(monthKey, {
        month: monthKey,
        monthLabel,
        points: 0,
        bonus: 0,
        total: 0,
        cost: 0,
        costPerThousand: 0,
      });
    }

    // Aggregate history data
    history.forEach(entry => {
      const monthKey = entry.month_year.slice(0, 7);
      const existing = monthlyData.get(monthKey);
      
      if (existing) {
        existing.points += entry.points_generated;
        existing.bonus += entry.bonus_generated;
        existing.total += entry.points_generated + entry.bonus_generated;
        existing.cost += entry.amount_paid;
        existing.costPerThousand = existing.total > 0 
          ? (existing.cost / existing.total) * 1000 
          : 0;
      }
    });

    return Array.from(monthlyData.values());
  };

  // Get accumulated totals
  const getAccumulatedTotals = () => {
    return history.reduce(
      (acc, entry) => ({
        totalPoints: acc.totalPoints + entry.points_generated,
        totalBonus: acc.totalBonus + entry.bonus_generated,
        totalPaid: acc.totalPaid + entry.amount_paid,
      }),
      { totalPoints: 0, totalBonus: 0, totalPaid: 0 }
    );
  };

  return {
    history,
    isLoading,
    addHistoryEntry,
    getMonthlyEvolution,
    getAccumulatedTotals,
  };
}
