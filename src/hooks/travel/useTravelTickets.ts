import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { TravelTicket } from './types';

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
      
      const { data, error } = await supabase
        .from('travel_tickets')
        .insert({ ...ticket, user_id: user.id } as never)
        .select()
        .single();
      
      if (error) throw error;

      // Update client miles balance - get current values first
      const { data: clientData } = await supabase
        .from('travel_clients')
        .select('miles_balance, total_miles_used, total_spent_brl')
        .eq('id', ticket.client_id ?? '')
        .single();

      if (clientData) {
        await supabase
          .from('travel_clients')
          .update({
            miles_balance: Math.max(0, (clientData.miles_balance || 0) - ticket.miles_used),
            total_miles_used: (clientData.total_miles_used || 0) + ticket.miles_used,
            total_spent_brl: (clientData.total_spent_brl || 0) + ticket.total_cost_brl,
          })
          .eq('id', ticket.client_id ?? '');
      }

      return data;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the ticket to know miles to refund
      const { data: ticket, error: fetchError } = await supabase
        .from('travel_tickets')
        .select('miles_used, total_cost_brl, client_id, miles_program, third_party_miles')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Refund miles to client
      const { data: clientData } = await supabase
        .from('travel_clients')
        .select('miles_balance, total_miles_used, total_spent_brl')
        .eq('id', ticket.client_id ?? '')
        .single();

      if (clientData) {
        await supabase
          .from('travel_clients')
          .update({
            miles_balance: (clientData.miles_balance || 0) + ticket.miles_used,
            total_miles_used: Math.max(0, (clientData.total_miles_used || 0) - ticket.miles_used),
            total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) - ticket.total_cost_brl),
          })
          .eq('id', ticket.client_id ?? '');
      }

      // Reverse the program balance by creating an entrada_manual operation
      if (ticket.miles_program && !ticket.third_party_miles && ticket.miles_used > 0 && user?.id) {
        await supabase.from('operations').insert({
          user_id: user.id,
          program: ticket.miles_program,
          type: 'entrada_manual',
          quantity: ticket.miles_used,
          status: 'confirmado',
          date: new Date().toISOString().split('T')[0],
          notes: `Estorno - Cancelamento de passagem`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      // Delete the ticket
      const { error } = await supabase
        .from('travel_tickets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelTicket> & { id: string }) => {
      // Get the original ticket to calculate balance adjustments
      const { data: originalTicket, error: fetchError } = await supabase
        .from('travel_tickets')
        .select('miles_used, total_cost_brl, client_id, miles_program, third_party_miles')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Update the ticket
      const { data, error } = await supabase
        .from('travel_tickets')
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
          .eq('id', originalTicket.client_id ?? '')
          .single();

        if (clientData) {
          const milesDiff = (updates.miles_used ?? originalTicket.miles_used) - originalTicket.miles_used;
          const costDiff = (updates.total_cost_brl ?? originalTicket.total_cost_brl) - originalTicket.total_cost_brl;

          await supabase
            .from('travel_clients')
            .update({
              miles_balance: Math.max(0, (clientData.miles_balance || 0) - milesDiff),
              total_miles_used: Math.max(0, (clientData.total_miles_used || 0) + milesDiff),
              total_spent_brl: Math.max(0, (clientData.total_spent_brl || 0) + costDiff),
            })
            .eq('id', originalTicket.client_id ?? '');
        }
      }

      // Adjust program balance if miles changed
      const program = updates.miles_program ?? originalTicket.miles_program;
      const isThirdParty = updates.third_party_miles ?? originalTicket.third_party_miles;
      
      if (program && !isThirdParty && updates.miles_used !== undefined && user?.id) {
        const milesDiff = updates.miles_used - originalTicket.miles_used;
        
        if (milesDiff !== 0) {
          // If miles increased, create resgate (deduct). If decreased, create entrada_manual (credit)
          await supabase.from('operations').insert({
            user_id: user.id,
            program: program,
            type: milesDiff > 0 ? 'resgate' : 'entrada_manual',
            quantity: Math.abs(milesDiff),
            status: 'confirmado',
            date: new Date().toISOString().split('T')[0],
            notes: milesDiff > 0 ? 'Ajuste - Aumento de milhas em passagem' : 'Ajuste - Redução de milhas em passagem',
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      return data;
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
