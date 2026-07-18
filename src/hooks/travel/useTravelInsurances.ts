import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelInsurance } from './types';

export function useTravelInsurances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-insurances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_insurances')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelInsurance[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelInsurance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (insurance: Omit<TravelInsurance, 'id' | 'user_id' | 'created_at' | 'client' | 'client_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('travel_insurances')
        .insert({ ...insurance, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-insurances'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Seguro viagem cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_insurances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-insurances'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Seguro viagem excluído com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelInsurance> & { id: string }) => {
      const { client: _client, ...rest } = updates as Partial<TravelInsurance> & { client?: unknown };
      const { data, error } = await supabase
        .from('travel_insurances')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-insurances'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Seguro viagem atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
