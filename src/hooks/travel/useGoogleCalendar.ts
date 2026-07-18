import { useState, useCallback } from 'react';
import { logger } from "@/lib/logger";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarStatus {
  connected: boolean;
  enabled?: boolean;
  calendar_id?: string;
  last_sync?: string;
}

export type ReservationType = 'ticket' | 'hotel' | 'car' | 'cruise' | 'insurance' | 'attraction' | 'transfer';

export function useGoogleCalendar() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Check connection status
  const { data: status, isLoading: isLoadingStatus } = useQuery<CalendarStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        return { connected: false };
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-auth?action=status', {});

      if (error) {
        logger.error('Error checking calendar status:', error);
        return { connected: false };
      }

      return data as CalendarStatus;
    },
    staleTime: 30000,
  });

  // Connect to Google Calendar
  const connect = useCallback(async () => {
    try {
      const redirectUrl = window.location.origin + '/agencia/configuracoes';
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth?action=init', {
        body: { redirect_url: redirectUrl },
      });

      if (error) {
        toast.error('Erro ao iniciar conexão com Google Calendar');
        return;
      }

      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      logger.error('Error connecting to Google Calendar:', error);
      toast.error('Erro ao conectar com Google Calendar');
    }
  }, []);

  // Disconnect from Google Calendar
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-calendar-auth?action=disconnect', {});
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Google Calendar desconectado');
    },
    onError: () => {
      toast.error('Erro ao desconectar Google Calendar');
    },
  });

  // Sync a single reservation
  const syncReservation = useCallback(async (
    reservationType: ReservationType,
    reservationId: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('sync-calendar-events', {
        body: {
          action: 'sync',
          reservation_type: reservationType,
          reservation_id: reservationId,
        },
      });

      if (error) {
        logger.error('Error syncing reservation:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error syncing reservation:', error);
      return false;
    }
  }, []);

  // Delete a calendar event
  const deleteCalendarEvent = useCallback(async (
    reservationType: ReservationType,
    reservationId: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('sync-calendar-events', {
        body: {
          action: 'delete',
          reservation_type: reservationType,
          reservation_id: reservationId,
        },
      });

      if (error) {
        logger.error('Error deleting calendar event:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      return false;
    }
  }, []);

  // Sync all reservations
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { action: 'sync_all' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success(`Sincronização concluída: ${data.synced} eventos sincronizados`);
    },
    onError: () => {
      setIsSyncing(false);
      toast.error('Erro ao sincronizar eventos');
    },
  });

  return {
    status,
    isLoadingStatus,
    isConnected: status?.connected ?? false,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    syncReservation,
    deleteCalendarEvent,
    syncAll: syncAllMutation.mutate,
    isSyncingAll: syncAllMutation.isPending || isSyncing,
  };
}
