import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelHotelReservation } from './types';
import { cancelTravelBooking, createTravelBooking, updateTravelBooking } from './travelMutationGateway';

export function useTravelHotelReservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-hotel-reservations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('travel_hotel_reservations')
        .select('*')
        .eq('user_id', user.id)
        .order('check_in', { ascending: false });
      
      if (error) throw error;
      return data as TravelHotelReservation[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelHotelReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reservation: Omit<TravelHotelReservation, 'id' | 'user_id' | 'created_at' | 'client'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return createTravelBooking<TravelHotelReservation>('hotel', reservation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-hotel-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      toast.success('Reserva de hotel criada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useDeleteTravelHotelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelTravelBooking('hotel', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-hotel-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Reserva cancelada e milhas reembolsadas!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}

export function useUpdateTravelHotelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelHotelReservation> & { id: string }) => {
      return updateTravelBooking<TravelHotelReservation>('hotel', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-hotel-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['travel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success('Reserva atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
