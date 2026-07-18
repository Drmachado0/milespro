import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

export interface VIPEntry {
  id: string;
  user_id: string;
  card_id: string;
  person_name: string;
  relationship: 'titular' | 'convidado';
  location: string;
  access_date: string;
  override: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  credit_cards?: {
    card_name: string;
    last_four_digits: string | null;
    cardholder_name: string | null;
    linked_program: string | null;
  };
}

export interface VIPEntryInsert {
  card_id: string;
  person_name: string;
  relationship: 'titular' | 'convidado';
  location: string;
  access_date: string;
  override?: boolean;
  notes?: string;
}

export interface VIPFilters {
  cardId?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  relationship?: 'titular' | 'convidado';
  search?: string;
}

export const vipQueryKeys = {
  entries: ['vip_entries'] as const,
  entriesList: (filters?: VIPFilters) => ['vip_entries', 'list', filters] as const,
  counters: ['vip_counters'] as const,
  cardsWithQuota: ['vip', 'cards_with_quota'] as const,
  allCardsStatus: ['vip', 'all_cards_status'] as const,
};

export function useVIPEntries(filters?: VIPFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: vipQueryKeys.entriesList(filters),
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('vip_entries')
        .select(`
          *,
          credit_cards (
            card_name,
            last_four_digits,
            cardholder_name,
            linked_program
          )
        `)
        .eq('user_id', user.id)
        .order('access_date', { ascending: false });

      if (filters?.cardId) {
        query = query.eq('card_id', filters.cardId);
      }

      if (filters?.startDate) {
        query = query.gte('access_date', startOfDay(filters.startDate).toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('access_date', endOfDay(filters.endDate).toISOString());
      }

      if (filters?.location) {
        query = query.eq('location', filters.location);
      }

      if (filters?.relationship) {
        query = query.eq('relationship', filters.relationship);
      }

      if (filters?.search) {
        query = query.ilike('person_name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VIPEntry[];
    },
    enabled: !!user,
  });
}

export function useVIPEntriesThisYear() {
  const { user } = useAuth();
  const today = new Date();

  return useQuery({
    queryKey: ['vip_entries', 'this_year'],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('vip_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('access_date', startOfYear(today).toISOString())
        .lte('access_date', endOfYear(today).toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useVIPEntriesToday() {
  const { user } = useAuth();
  const today = new Date();

  return useQuery({
    queryKey: ['vip_entries', 'today'],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('vip_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('access_date', startOfDay(today).toISOString())
        .lte('access_date', endOfDay(today).toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useVIPEntriesThisMonth() {
  const { user } = useAuth();
  const today = new Date();

  return useQuery({
    queryKey: ['vip_entries', 'this_month'],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('vip_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('access_date', startOfMonth(today).toISOString())
        .lte('access_date', endOfMonth(today).toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useCreateVIPEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: VIPEntryInsert) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vip_entries')
        .insert({
          ...entry,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.entries });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success(
        `✅ Entrada VIP registrada com sucesso! ${data.person_name} - ${data.location}`,
        { duration: 4000 }
      );
    },
    onError: (error) => {
      toast.error(`❌ Erro ao registrar entrada VIP: ${getSafeErrorMessage(error)}`, {
        duration: 4000,
      });
    },
  });
}

export function useUpdateVIPEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VIPEntry> & { id: string }) => {
      const { credit_cards: _cc, ...rest } = updates as Partial<VIPEntry> & { credit_cards?: unknown };
      const { data, error } = await supabase
        .from('vip_entries')
        .update(rest)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.entries });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success('✅ Entrada VIP atualizada com sucesso!', { duration: 4000 });
    },
    onError: (error) => {
      toast.error(`❌ Erro ao atualizar entrada VIP: ${getSafeErrorMessage(error)}`, {
        duration: 4000,
      });
    },
  });
}

export function useDeleteVIPEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vip_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.entries });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success('✅ Entrada VIP excluída com sucesso!', { duration: 4000 });
    },
    onError: (error) => {
      toast.error(`❌ Erro ao excluir entrada VIP: ${getSafeErrorMessage(error)}`, {
        duration: 4000,
      });
    },
  });
}

export function useVIPLocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vip_locations'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('vip_entries')
        .select('location')
        .eq('user_id', user.id);

      if (error) throw error;

      // Get unique locations
      const uniqueLocations = [...new Set(data.map(d => d.location))];
      return uniqueLocations;
    },
    enabled: !!user,
  });
}
