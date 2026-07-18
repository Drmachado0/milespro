import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelCruise } from './types';

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
      
      const { data, error } = await supabase
        .from('travel_cruises')
        .insert({ ...cruise, user_id: user.id } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: cruise, error: fetchError } = await supabase
        .from('travel_cruises')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const { data: clientData } = await supabase
        .from('travel_clients')
        .select('miles_balance, total_miles_used, total_spent_brl')
        .eq('id', cruise.client_id ?? '')
        .single();

      if (clientData) {
        await supabase
          .from('travel_clients')
          .update({
            miles_balance: (clientData.miles_balance || 0) + cruise.miles_used,
            total_miles_used: Math.max(0, (clientData.total_miles_used || 0) - cruise.miles_used),
            total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) - cruise.total_cost_brl),
          })
          .eq('id', cruise.client_id ?? '');
      }

      if (cruise.miles_program && cruise.miles_used > 0 && user?.id) {
        await supabase.from('operations').insert({
          user_id: user.id,
          program: cruise.miles_program,
          type: 'entrada_manual',
          quantity: cruise.miles_used,
          status: 'confirmado',
          date: new Date().toISOString().split('T')[0],
          notes: `Estorno - Cancelamento de cruzeiro`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      const { error } = await supabase
        .from('travel_cruises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelCruise> & { id: string }) => {
      const { data: originalCruise, error: fetchError } = await supabase
        .from('travel_cruises')
        .select('miles_used, total_cost_brl, client_id, miles_program')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('travel_cruises')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (updates.miles_used !== undefined || updates.total_cost_brl !== undefined) {
        const { data: clientData } = await supabase
          .from('travel_clients')
          .select('miles_balance, total_miles_used, total_spent_brl')
          .eq('id', originalCruise.client_id ?? '')
          .single();

        if (clientData) {
          const milesDiff = (updates.miles_used ?? originalCruise.miles_used) - originalCruise.miles_used;
          const costDiff = (updates.total_cost_brl ?? originalCruise.total_cost_brl) - originalCruise.total_cost_brl;

          await supabase
            .from('travel_clients')
            .update({
              miles_balance: Math.max(0, (clientData.miles_balance || 0) - milesDiff),
              total_miles_used: Math.max(0, (clientData.total_miles_used || 0) + milesDiff),
              total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) + costDiff),
            })
            .eq('id', originalCruise.client_id ?? '');
        }
      }

      const program = updates.miles_program ?? originalCruise.miles_program;
      
      if (program && updates.miles_used !== undefined && user?.id) {
        const milesDiff = updates.miles_used - originalCruise.miles_used;
        
        if (milesDiff !== 0) {
          await supabase.from('operations').insert({
            user_id: user.id,
            program: program,
            type: milesDiff > 0 ? 'resgate' : 'entrada_manual',
            quantity: Math.abs(milesDiff),
            status: 'confirmado',
            date: new Date().toISOString().split('T')[0],
            notes: milesDiff > 0 ? 'Ajuste - Aumento de milhas em cruzeiro' : 'Ajuste - Redução de milhas em cruzeiro',
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      return data;
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
