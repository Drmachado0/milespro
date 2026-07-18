import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';

export interface ExpiringProgram {
  program: string;
  expiringMiles: number;
  expiryDate: string;
  daysUntilExpiry: number;
}

export function useExpirationAlerts() {
  const { user } = useAuth();
  const { isEnabled, sendNotification } = useNotifications();
  const queryClient = useQueryClient();

  // Fetch program balances with expiry dates.
  // Expiration data changes on a daily basis at best (a balance doesn't gain
  // a new expiry between two minutes), so the previous `refetchInterval: 60000`
  // was hammering Supabase (~1440 reads/day per session) without ever surfacing
  // fresher data. staleTime=6h relies on the default refetchOnWindowFocus to
  // catch the once-a-day case the user actually cares about.
  const { data: expiringPrograms = [], isLoading } = useQuery({
    queryKey: ['expiring-programs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_balances')
        .select('program, expiring_soon, expiry_date')
        .gt('expiring_soon', 0)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      return (data || []).map(item => {
        const expiryDate = new Date(item.expiry_date!);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          program: item.program,
          expiringMiles: item.expiring_soon || 0,
          expiryDate: item.expiry_date!,
          daysUntilExpiry,
        };
      }).filter(item => item.daysUntilExpiry <= 90 && item.daysUntilExpiry > 0);
    },
    enabled: !!user,
    staleTime: 6 * 60 * 60 * 1000,
  });

  // Create alert for expiring miles
  const createExpirationAlert = useMutation({
    mutationFn: async (program: ExpiringProgram) => {
      if (!user) return;
      
      // Check if alert already exists for this program/date
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', `Milhas ${program.program} expirando`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (existing && existing.length > 0) return;
      
      const { error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          title: `Milhas ${program.program} expirando`,
          description: `${program.expiringMiles.toLocaleString('pt-BR')} milhas vencem em ${program.daysUntilExpiry} dias (${new Date(program.expiryDate).toLocaleDateString('pt-BR')})`,
          type: 'warning',
          date: program.expiryDate,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Auto-create database alerts + push notifications when the expiring set
  // actually changes. Previously this lived in a useCallback whose deps included
  // the (unstable) mutation object, so the effect fired on every render and
  // submitted INSERT-or-dedupe roundtrips to Supabase on a loop. We narrow the
  // dep to `expiringPrograms.length`: a row appearing/disappearing in the
  // window is the only real change worth a re-fire. The 24h dedupe inside
  // createExpirationAlert.mutationFn is still the safety net against multiple
  // tabs racing.
  useEffect(() => {
    if (!expiringPrograms.length) return;

    for (const program of expiringPrograms) {
      createExpirationAlert.mutate(program);

      if (isEnabled && program.daysUntilExpiry <= 30) {
        sendNotification(`⚠️ Milhas ${program.program} Expirando!`, {
          body: `${program.expiringMiles.toLocaleString('pt-BR')} milhas vencem em ${program.daysUntilExpiry} dias`,
          tag: `expiry-${program.program}`,
          data: { url: '/alertas' },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringPrograms.length]);

  // Get urgency level
  const getUrgencyLevel = (days: number): 'critical' | 'warning' | 'info' => {
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'info';
  };

  // Total expiring miles
  const totalExpiringMiles = expiringPrograms.reduce((sum, p) => sum + p.expiringMiles, 0);
  
  // Critical expirations (7 days or less)
  const criticalExpirations = expiringPrograms.filter(p => p.daysUntilExpiry <= 7);

  return {
    expiringPrograms,
    totalExpiringMiles,
    criticalExpirations,
    isLoading,
    getUrgencyLevel,
  };
}
