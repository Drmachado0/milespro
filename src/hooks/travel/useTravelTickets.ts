import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelTicket } from './types';
import { cancelTravelBooking, createTravelBooking, updateTravelBooking } from './travelMutationGateway';

export function useTravelTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_tickets')
        .select('*, client:travel_clients(*)')
        .eq('user_id', user.id)
        .order('flight_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelTicket[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ticket: Omit<TravelTicket, 'id' | 'user_id' | 'created_at' | 'client'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return createTravelBooking<TravelTicket>('ticket', ticket);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Passagem emitida com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelTravelBooking('ticket', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Passagem cancelada e milhas reembolsadas!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelTicket> & { id: string }) => {
      return updateTravelBooking<TravelTicket>('ticket', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Passagem atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
