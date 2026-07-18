import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';
import { Promotion, PromotionType } from '@/types/promotion';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { PromotionsContext, type PromotionsContextValue } from '@/contexts/promotions-context';

const isDev = import.meta.env.DEV;

// Realtime reconnection config
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

const typeLabels: Record<PromotionType, string> = {
  promo: '🎁 Promoção',
  bonus: '⭐ Bônus',
  warning: '⚠️ Alerta',
  income: '💰 Rendimento',
};

interface PromotionsProviderProps {
  children: ReactNode;
}

export function PromotionsProvider({ children }: PromotionsProviderProps) {
  const { user } = useAuth();
  const { settings, isInQuietHours, canSendNotification, isTemporarilyPaused } = useAlertSettings();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [readPromotionIds, setReadPromotionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const channelIdRef = useRef<string>(`promotions-${Date.now()}`);

  const fetchReadPromotions = useCallback(async () => {
    if (!user) {
      setReadPromotionIds(new Set());
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_promotion_reads')
        .select('promotion_id')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const readIds = new Set((data || []).map(r => r.promotion_id));
      setReadPromotionIds(readIds);
    } catch (err) {
      logger.error('Error fetching read promotions:', err);
    }
  }, [user]);

  const fetchPromotions = useCallback(async () => {
    if (!settings.alerts_enabled || isTemporarilyPaused()) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      let query = supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (settings.enabled_types.length > 0 && settings.enabled_types.length < 4) {
        query = query.in('type', settings.enabled_types);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPromotions((data as Promotion[]) || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar promoções');
      logger.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [settings.alerts_enabled, settings.enabled_types, isTemporarilyPaused]);

  const markAsRead = useCallback(async (promotionId: string) => {
    if (!user) return;
    
    setReadPromotionIds(prev => new Set([...prev, promotionId]));

    try {
      const { error: insertError } = await supabase
        .from('user_promotion_reads')
        .insert({
          user_id: user.id,
          promotion_id: promotionId,
        });

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }
    } catch (err) {
      logger.error('Error marking promotion as read:', err);
      setReadPromotionIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(promotionId);
        return newSet;
      });
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user || promotions.length === 0) return;

    const unreadIds = promotions
      .filter(p => !readPromotionIds.has(p.id))
      .map(p => p.id);

    if (unreadIds.length === 0) return;

    setReadPromotionIds(prev => new Set([...prev, ...unreadIds]));

    try {
      const inserts = unreadIds.map(promotion_id => ({
        user_id: user.id,
        promotion_id,
      }));

      const { error: insertError } = await supabase
        .from('user_promotion_reads')
        .insert(inserts);

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }
    } catch (err) {
      logger.error('Error marking all promotions as read:', err);
      await fetchReadPromotions();
    }
  }, [user, promotions, readPromotionIds, fetchReadPromotions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchPromotions();
  }, [fetchPromotions]);

  const clearNewCount = useCallback(() => {
    setNewCount(0);
  }, []);

  const sendPushNotification = useCallback((promotion: Promotion) => {
    if (!canSendNotification()) return;
    if (!settings.enabled_types.includes(promotion.type)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const typeLabel = typeLabels[promotion.type] || '📢 Novidade';
      
      const notification = new Notification(typeLabel, {
        body: promotion.title,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `promo-${promotion.id}`,
        data: { url: '/alertas' },
        requireInteraction: false,
        silent: !settings.sound_enabled,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        window.location.href = '/alertas';
      };

      setTimeout(() => notification.close(), 8000);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }, [canSendNotification, settings.enabled_types, settings.sound_enabled]);

  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!settings.alerts_enabled) {
      setIsLive(false);
      return;
    }

    // Use unique channel name to avoid conflicts
    const channelName = channelIdRef.current;
    
    if (isDev) logger.log('Setting up realtime channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotions',
        },
        (payload) => {
          if (isDev) logger.log('Realtime change received:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newPromotion = payload.new as Promotion;
            const isTypeEnabled = settings.enabled_types.includes(newPromotion.type);
            
            if (newPromotion.is_active && isTypeEnabled) {
              setPromotions((prev) => [newPromotion, ...prev].slice(0, 50));
              setLastUpdate(new Date());
              setNewCount((prev) => prev + 1);
              sendPushNotification(newPromotion);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Promotion;
            
            setPromotions((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
                .filter((p) => p.is_active && (settings.enabled_types.length === 0 || settings.enabled_types.includes(p.type)))
            );
            setLastUpdate(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Promotion;
            setPromotions((prev) => prev.filter((p) => p.id !== deleted.id));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe((status, err) => {
        if (isDev) logger.log('Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (isDev) logger.warn('Channel error:', status, err);
          setIsLive(false);
          
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(
              BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
              MAX_RECONNECT_DELAY
            );
            
            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                reconnectAttemptsRef.current++;
                // Generate new channel ID for reconnection
                channelIdRef.current = `promotions-${Date.now()}`;
                if (isDev) logger.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}...`);
                setupRealtimeSubscription();
              }, delay);
            }
          } else {
            if (isDev) logger.warn('Max reconnect attempts reached, using polling mode');
          }
        } else if (status === 'CLOSED') {
          setIsLive(false);
        }
      });

    channelRef.current = channel;
  }, [sendPushNotification, settings.alerts_enabled, settings.enabled_types]);

  // Initial fetch
  useEffect(() => {
    fetchPromotions();
    fetchReadPromotions();
  }, [fetchPromotions, fetchReadPromotions]);

  // Realtime subscription
  useEffect(() => {
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupRealtimeSubscription]);

  // Periodic refresh as fallback
  useEffect(() => {
    if (!settings.alerts_enabled || isTemporarilyPaused()) return;
    if (isLive) return;

    const intervalMs = settings.fetch_interval * 60 * 1000;
    
    const interval = setInterval(() => {
      if (!isInQuietHours()) {
        if (isDev) logger.log(`Fallback refresh (interval: ${settings.fetch_interval}min)`);
        fetchPromotions();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isLive, fetchPromotions, settings.alerts_enabled, settings.fetch_interval, isInQuietHours, isTemporarilyPaused]);

  const value: PromotionsContextValue = {
    promotions,
    loading,
    error,
    lastUpdate,
    refresh,
    isLive,
    newCount,
    clearNewCount,
    markAsRead,
    markAllAsRead,
    readPromotionIds,
  };

  return (
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  );
}

