import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelCruise } from './types';
import { cancelTravelBooking, createTravelBooking, updateTravelBooking } from './travelMutationGateway';

export function useTravelCruises() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-cruises', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_cruises')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('departure_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelCruise[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelCruise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (cruise: Omit<TravelCruise, 'id' | 'user_id' | 'created_at' | 'client' | 'client_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return createTravelBooking<TravelCruise>('cruise', cruise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-cruises'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Cruzeiro cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelCruise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelTravelBooking('cruise', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-cruises'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Cruzeiro cancelado e milhas reembolsadas!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelCruise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelCruise> & { id: string }) => {
      return updateTravelBooking<TravelCruise>('cruise', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-cruises'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Cruzeiro atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
