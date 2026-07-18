import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelCarRental } from './types';

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
      
      const { data, error } = await supabase
        .from('travel_car_rentals')
        .insert({ ...rental, user_id: user.id } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the rental to know miles to refund
      const { data: rental, error: fetchError } = await supabase
        .from('travel_car_rentals')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Refund miles to client
      const { data: clientData } = await supabase
        .from('travel_clients')
        .select('miles_balance, total_miles_used, total_spent_brl')
        .eq('id', rental.client_id ?? '')
        .single();

      if (clientData) {
        await supabase
          .from('travel_clients')
          .update({
            miles_balance: (clientData.miles_balance || 0) + rental.miles_used,
            total_miles_used: Math.max(0, (clientData.total_miles_used || 0) - rental.miles_used),
            total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) - rental.total_cost_brl),
          })
          .eq('id', rental.client_id ?? '');
      }

      // Reverse the program balance by creating an entrada_manual operation
      if (rental.miles_program && rental.miles_used > 0 && user?.id) {
        await supabase.from('operations').insert({
          user_id: user.id,
          program: rental.miles_program,
          type: 'entrada_manual',
          quantity: rental.miles_used,
          status: 'confirmado',
          date: new Date().toISOString().split('T')[0],
          notes: `Estorno - Cancelamento de aluguel de carro`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      // Delete the rental
      const { error } = await supabase
        .from('travel_car_rentals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelCarRental> & { id: string }) => {
      // Get the original rental to calculate balance adjustments
      const { data: originalRental, error: fetchError } = await supabase
        .from('travel_car_rentals')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Update the rental
      const { data, error } = await supabase
        .from('travel_car_rentals')
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
          .eq('id', originalRental.client_id ?? '')
          .single();

        if (clientData) {
          const milesDiff = (updates.miles_used ?? originalRental.miles_used) - originalRental.miles_used;
          const costDiff = (updates.total_cost_brl ?? originalRental.total_cost_brl) - originalRental.total_cost_brl;

          await supabase
            .from('travel_clients')
            .update({
              miles_balance: Math.max(0, (clientData.miles_balance || 0) - milesDiff),
              total_miles_used: Math.max(0, (clientData.total_miles_used || 0) + milesDiff),
              total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) + costDiff),
            })
            .eq('id', originalRental.client_id ?? '');
        }
      }

      // Adjust program balance if miles changed
      const program = updates.miles_program ?? originalRental.miles_program;
      
      if (program && updates.miles_used !== undefined && user?.id) {
        const milesDiff = updates.miles_used - originalRental.miles_used;
        
        if (milesDiff !== 0) {
          await supabase.from('operations').insert({
            user_id: user.id,
            program: program,
            type: milesDiff > 0 ? 'resgate' : 'entrada_manual',
            quantity: Math.abs(milesDiff),
            status: 'confirmado',
            date: new Date().toISOString().split('T')[0],
            notes: milesDiff > 0 ? 'Ajuste - Aumento de milhas em aluguel de carro' : 'Ajuste - Redução de milhas em aluguel de carro',
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      return data;
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
