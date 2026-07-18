import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelAttraction } from './types';

export function useTravelAttractions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-attractions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_attractions')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelAttraction[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelAttraction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (attraction: Omit<TravelAttraction, 'id' | 'user_id' | 'created_at' | 'client' | 'client_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('travel_attractions')
        .insert({ ...attraction, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-attractions'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Atração turística cadastrada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelAttraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_attractions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-attractions'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Atração turística excluída com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelAttraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelAttraction> & { id: string }) => {
      const { client: _client, ...rest } = updates as Partial<TravelAttraction> & { client?: unknown };
      const { data, error } = await supabase
        .from('travel_attractions')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-attractions'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Atração turística atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
