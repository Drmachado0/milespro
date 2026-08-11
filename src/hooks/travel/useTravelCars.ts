import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelCarRental } from './types';
import { cancelTravelBooking, createTravelBooking, updateTravelBooking } from './travelMutationGateway';

export function useTravelCarRentals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-car-rentals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_car_rentals')
        .select('*')
        .eq('user_id', user.id)
        .order('pickup_date', { ascending: false });
      
      if (error) throw error;
      return data as TravelCarRental[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelCarRental() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rental: Omit<TravelCarRental, 'id' | 'user_id' | 'created_at' | 'client'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return createTravelBooking<TravelCarRental>('car', rental);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-car-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Aluguel de carro criado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelCarRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelTravelBooking('car', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-car-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Aluguel cancelado e milhas reembolsadas!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelCarRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelCarRental> & { id: string }) => {
      return updateTravelBooking<TravelCarRental>('car', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-car-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Aluguel atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
