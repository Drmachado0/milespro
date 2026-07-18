import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useOverdueBonusesCount() {
  const { user } = useAuth();

  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['overdue_bonuses_count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { count, error } = await supabase
        .from('pending_bonuses')
        .select('*', { count: 'exact', head: true })
        .eq('confirmed', false)
        .lt('expected_date', today);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  return { overdueCount };
}
