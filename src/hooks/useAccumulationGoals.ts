import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProgramBalances } from './useProgramBalances';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

export interface AccumulationGoal {
  id: string;
  user_id: string;
  program: string;
  target_quantity: number;
  current_quantity: number;
  deadline: string | null;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalData {
  program: string;
  target_quantity: number;
  deadline?: string | null;
  notes?: string | null;
}

export function useAccumulationGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { balances } = useProgramBalances();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['accumulation-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('accumulation_goals')
        .select('*')
        .eq('user_id', user.id) // Explicit filter for defense in depth
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccumulationGoal[];
    },
    enabled: !!user?.id,
  });

  // Update current quantities based on actual balances
  const goalsWithProgress = goals.map(goal => {
    const balance = balances.find(b => b.program === goal.program);
    const currentQuantity = balance?.balance || 0;
    const progress = Math.min((currentQuantity / goal.target_quantity) * 100, 100);
    const isCompleted = currentQuantity >= goal.target_quantity;
    
    return {
      ...goal,
      current_quantity: currentQuantity,
      progress,
      isCompleted,
      remaining: Math.max(goal.target_quantity - currentQuantity, 0),
    };
  });

  const createGoal = useMutation({
    mutationFn: async (data: CreateGoalData) => {
      if (!user) throw new Error('User not authenticated');

      const { data: newGoal, error } = await supabase
        .from('accumulation_goals')
        .insert({
          user_id: user.id,
          program: data.program,
          target_quantity: data.target_quantity,
          deadline: data.deadline || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulation-goals'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AccumulationGoal> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('accumulation_goals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulation-goals'] });
      toast.success('Meta atualizada!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accumulation_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulation-goals'] });
      toast.success('Meta removida!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const markAsCompleted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accumulation_goals')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accumulation-goals'] });
      toast.success('Meta concluída! 🎉');
    },
  });

  return {
    goals: goalsWithProgress,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    markAsCompleted,
  };
}
