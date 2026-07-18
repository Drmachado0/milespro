import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelQuote } from './types';

export function useTravelQuotes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-quotes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_quotes')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TravelQuote[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (quote: Omit<TravelQuote, 'id' | 'user_id' | 'created_at' | 'client'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('travel_quotes')
        .insert({ ...quote, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-quotes'] });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelQuote> & { id: string }) => {
      const { client: _client, ...rest } = updates as Partial<TravelQuote> & { client?: unknown };
      const { data, error } = await supabase
        .from('travel_quotes')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-quotes'] });
      toast.success('Orçamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_quotes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-quotes'] });
      toast.success('Orçamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir orçamento: ' + error.message);
    },
  });
}
