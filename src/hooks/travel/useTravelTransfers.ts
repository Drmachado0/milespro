import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelTransfer } from './types';

export function useTravelTransfers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-transfers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_transfers')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('transfer_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelTransfer[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transfer: Omit<TravelTransfer, 'id' | 'user_id' | 'created_at' | 'client' | 'client_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('travel_transfers')
        .insert({ ...transfer, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Transfer cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_transfers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Transfer excluído com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelTransfer> & { id: string }) => {
      const { client: _client, ...rest } = updates as Partial<TravelTransfer> & { client?: unknown };
      const { data, error } = await supabase
        .from('travel_transfers')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Transfer atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
