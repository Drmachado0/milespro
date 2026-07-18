import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelHotelReservation } from './types';

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
      
      const { data, error } = await supabase
        .from('travel_hotel_reservations')
        .insert({ ...reservation, user_id: user.id } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the reservation to know miles to refund
      const { data: reservation, error: fetchError } = await supabase
        .from('travel_hotel_reservations')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Refund miles to client
      const { data: clientData } = await supabase
        .from('travel_clients')
        .select('miles_balance, total_miles_used, total_spent_brl')
        .eq('id', reservation.client_id ?? '')
        .single();

      if (clientData) {
        await supabase
          .from('travel_clients')
          .update({
            miles_balance: (clientData.miles_balance || 0) + reservation.miles_used,
            total_miles_used: Math.max(0, (clientData.total_miles_used || 0) - reservation.miles_used),
            total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) - reservation.total_cost_brl),
          })
          .eq('id', reservation.client_id ?? '');
      }

      // Reverse the program balance by creating an entrada_manual operation
      if (reservation.miles_program && reservation.miles_used > 0 && user?.id) {
        await supabase.from('operations').insert({
          user_id: user.id,
          program: reservation.miles_program,
          type: 'entrada_manual',
          quantity: reservation.miles_used,
          status: 'confirmado',
          date: new Date().toISOString().split('T')[0],
          notes: `Estorno - Cancelamento de reserva de hotel`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      // Delete the reservation
      const { error } = await supabase
        .from('travel_hotel_reservations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelHotelReservation> & { id: string }) => {
      // Get the original reservation to calculate balance adjustments
      const { data: originalReservation, error: fetchError } = await supabase
        .from('travel_hotel_reservations')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Update the reservation
      const { data, error } = await supabase
        .from('travel_hotel_reservations')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Adjust client balance if miles or cost changed
      if (updates.miles_used !== undefined || updates.total_cost_brl !== undefined) {
        const { data: clientData } = await supabase
          .from('travel_clients')
          .select('miles_balance, total_miles_used, total_spent_brl')
          .eq('id', originalReservation.client_id ?? '')
          .single();

        if (clientData) {
          const milesDiff = (updates.miles_used ?? originalReservation.miles_used) - originalReservation.miles_used;
          const costDiff = (updates.total_cost_brl ?? originalReservation.total_cost_brl) - originalReservation.total_cost_brl;

          await supabase
            .from('travel_clients')
            .update({
              miles_balance: Math.max(0, (clientData.miles_balance || 0) - milesDiff),
              total_miles_used: Math.max(0, (clientData.total_miles_used || 0) + milesDiff),
              total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) + costDiff),
            })
            .eq('id', originalReservation.client_id ?? '');
        }
      }

      // Adjust program balance if miles changed
      const program = updates.miles_program ?? originalReservation.miles_program;
      
      if (program && updates.miles_used !== undefined && user?.id) {
        const milesDiff = updates.miles_used - originalReservation.miles_used;
        
        if (milesDiff !== 0) {
          await supabase.from('operations').insert({
            user_id: user.id,
            program: program,
            type: milesDiff > 0 ? 'resgate' : 'entrada_manual',
            quantity: Math.abs(milesDiff),
            status: 'confirmado',
            date: new Date().toISOString().split('T')[0],
            notes: milesDiff > 0 ? 'Ajuste - Aumento de milhas em reserva de hotel' : 'Ajuste - Redução de milhas em reserva de hotel',
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      return data;
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
