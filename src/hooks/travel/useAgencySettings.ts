import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import type { AgencySettings } from './types';

export function useAgencySettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agency-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as AgencySettings | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateAgencySettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<AgencySettings>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('agency_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('agency_settings')
          .update(settings)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('agency_settings')
          .insert({ ...settings, user_id: user.id, name: settings.name || 'Minha Agência' })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });
}
