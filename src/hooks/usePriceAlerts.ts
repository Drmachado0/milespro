import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useNotifications } from '@/hooks/useNotifications';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

export interface PriceAlert {
  id: string;
  user_id: string;
  program: string;
  target_buy_price: number | null;
  target_sell_price: number | null;
  is_active: boolean;
  triggered_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

const NOTIFICATION_COOLDOWN_HOURS = 6;

export function usePriceAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { prices } = useMarketPrices();
  const { sendNotification, isEnabled: notificationsEnabled } = useNotifications();
  const [notifiedAlerts, setNotifiedAlerts] = useState<Set<string>>(new Set());

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['price-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('program', { ascending: true });
      
      if (error) throw error;
      return data as PriceAlert[];
    },
    enabled: !!user?.id,
  });

  // Check which alerts have been triggered
  const triggeredAlerts = alerts.filter(alert => {
    if (!alert.is_active) return false;
    const marketPrice = prices?.find(p => p.program === alert.program);
    if (!marketPrice) return false;

    if (alert.target_buy_price && marketPrice.buy_price <= alert.target_buy_price) {
      return true;
    }
    if (alert.target_sell_price && marketPrice.sell_price >= alert.target_sell_price) {
      return true;
    }
    return false;
  });

  // Send notifications for triggered alerts
  const checkAndNotifyAlerts = useCallback(async () => {
    if (!notificationsEnabled || !prices || prices.length === 0) return;

    for (const alert of alerts) {
      if (!alert.is_active) continue;
      if (notifiedAlerts.has(alert.id)) continue;
      
      // Check cooldown
      if (alert.last_notified_at) {
        const lastNotified = new Date(alert.last_notified_at);
        const hoursSince = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);
        if (hoursSince < NOTIFICATION_COOLDOWN_HOURS) continue;
      }

      const marketPrice = prices.find(p => p.program === alert.program);
      if (!marketPrice) continue;

      let shouldNotify = false;
      let notificationBody = '';

      if (alert.target_buy_price && marketPrice.buy_price <= alert.target_buy_price) {
        shouldNotify = true;
        notificationBody = `${alert.program}: Preço de compra R$ ${marketPrice.buy_price.toFixed(2)} atingiu sua meta de R$ ${alert.target_buy_price.toFixed(2)}`;
      } else if (alert.target_sell_price && marketPrice.sell_price >= alert.target_sell_price) {
        shouldNotify = true;
        notificationBody = `${alert.program}: Preço de venda R$ ${marketPrice.sell_price.toFixed(2)} atingiu sua meta de R$ ${alert.target_sell_price.toFixed(2)}`;
      }

      if (shouldNotify) {
        sendNotification('Alerta de Preço!', {
          body: notificationBody,
          tag: `price-alert-${alert.id}`,
          data: { url: '/gestao/precos-programas' },
        });

        // Mark as notified locally
        setNotifiedAlerts(prev => new Set([...prev, alert.id]));

        // Update last_notified_at in database
        await supabase
          .from('price_alerts')
          .update({ 
            last_notified_at: new Date().toISOString(),
            triggered_at: new Date().toISOString()
          })
          .eq('id', alert.id);
      }
    }
  }, [alerts, prices, notificationsEnabled, notifiedAlerts, sendNotification]);

  // Check for triggered alerts periodically
  useEffect(() => {
    if (alerts.length > 0 && prices && prices.length > 0) {
      checkAndNotifyAlerts();
    }
  }, [alerts, prices, checkAndNotifyAlerts]);

  const createAlert = useMutation({
    mutationFn: async (data: { program: string; target_buy_price?: number; target_sell_price?: number }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('price_alerts')
        .upsert({
          user_id: user.id,
          program: data.program,
          target_buy_price: data.target_buy_price || null,
          target_sell_price: data.target_sell_price || null,
          is_active: true,
        }, { onConflict: 'user_id,program' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast({ title: 'Alerta criado!', description: 'Você será notificado quando o preço atingir a meta.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar alerta', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  const updateAlert = useMutation({
    // `null` explicitly clears a threshold; `undefined` leaves it untouched
    // (supabase-js omits undefined keys from the PATCH body).
    mutationFn: async (data: { id: string; target_buy_price?: number | null; target_sell_price?: number | null; is_active?: boolean }) => {
      const { error } = await supabase
        .from('price_alerts')
        .update({
          target_buy_price: data.target_buy_price,
          target_sell_price: data.target_sell_price,
          is_active: data.is_active,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast({ title: 'Alerta atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar alerta', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast({ title: 'Alerta removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover alerta', description: getSafeErrorMessage(error), variant: 'destructive' });
    },
  });

  return {
    alerts,
    triggeredAlerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    checkAndNotifyAlerts,
  };
}
