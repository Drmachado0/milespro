import { useState, useEffect, useCallback } from 'react';
import { logger } from "@/lib/logger";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

export interface AlertSettings {
  id?: string;
  user_id?: string;
  alerts_enabled: boolean;
  fetch_interval: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sound_enabled: boolean;
  enabled_sources: string[];
  enabled_types: string[];
  source_urls: Record<string, string>;
}

const DEFAULT_SOURCE_URLS: Record<string, string> = {
  'MelhoresCartões': 'https://melhorescartoes.com.br',
  'Passageiro de Primeira': 'https://passageirodeprimeira.com',
  'Livelo': 'https://www.livelo.com.br/promocoes',
  'Melhores Destinos': 'https://www.melhoresdestinos.com.br',
};

const DEFAULT_SETTINGS: AlertSettings = {
  alerts_enabled: true,
  fetch_interval: 30,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  sound_enabled: true,
  enabled_sources: ['MelhoresCartões', 'Passageiro de Primeira', 'Livelo', 'Melhores Destinos'],
  enabled_types: ['promo', 'bonus', 'warning', 'income'],
  source_urls: DEFAULT_SOURCE_URLS,
};

const AVAILABLE_SOURCES = [
  'MelhoresCartões',
  'Passageiro de Primeira',
  'Livelo',
  'Melhores Destinos',
];

const AVAILABLE_TYPES = [
  { value: 'promo', label: 'Promoções' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'warning', label: 'Avisos' },
  { value: 'income', label: 'Oportunidades' },
];

export function useAlertSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pausedUntil, setPausedUntil] = useState<Date | null>(null);

  // Fetch settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['alert-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from('user_alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching alert settings:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        // Create default settings for user
        const { data: newData, error: insertError } = await supabase
          .from('user_alert_settings')
          .insert({
            user_id: user.id,
            ...DEFAULT_SETTINGS,
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Error creating alert settings:', insertError);
          return DEFAULT_SETTINGS;
        }

        return newData as AlertSettings;
      }

      return data as AlertSettings;
    },
    enabled: !!user?.id,
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<AlertSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_alert_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // Toggle alerts enabled/disabled
  const toggleAlerts = useCallback(() => {
    const newState = !settings?.alerts_enabled;
    updateSettings.mutate({ alerts_enabled: newState });
    toast({
      title: newState ? 'Alertas ativados' : 'Alertas desativados',
      description: newState 
        ? 'Você receberá notificações de novas promoções.' 
        : 'As notificações foram pausadas.',
    });
  }, [settings?.alerts_enabled, updateSettings]);

  // Pause alerts temporarily (1 hour)
  const pauseFor1Hour = useCallback(() => {
    const until = new Date(Date.now() + 60 * 60 * 1000);
    setPausedUntil(until);
    localStorage.setItem('alertsPausedUntil', until.toISOString());
    toast({
      title: 'Alertas pausados por 1 hora',
      description: 'Você não receberá notificações até ' + until.toLocaleTimeString('pt-BR'),
    });
  }, []);

  // Check if currently in quiet hours
  const isInQuietHours = useCallback(() => {
    if (!settings) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = settings.quiet_hours_start.split(':').map(Number);
    const [endH, endM] = settings.quiet_hours_end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
    
    return currentTime >= startMinutes && currentTime < endMinutes;
  }, [settings]);

  // Check if temporarily paused
  const isTemporarilyPaused = useCallback(() => {
    if (!pausedUntil) return false;
    return new Date() < pausedUntil;
  }, [pausedUntil]);

  // Get current status
  const getStatus = useCallback((): 'active' | 'paused' | 'quiet' | 'disabled' => {
    if (!settings?.alerts_enabled) return 'disabled';
    if (isTemporarilyPaused()) return 'paused';
    if (isInQuietHours()) return 'quiet';
    return 'active';
  }, [settings?.alerts_enabled, isTemporarilyPaused, isInQuietHours]);

  // Can send notification check
  const canSendNotification = useCallback(() => {
    if (!settings?.alerts_enabled) return false;
    if (isTemporarilyPaused()) return false;
    if (isInQuietHours()) return false;
    return true;
  }, [settings?.alerts_enabled, isTemporarilyPaused, isInQuietHours]);

  // Load paused state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('alertsPausedUntil');
    if (stored) {
      const until = new Date(stored);
      if (until > new Date()) {
        setPausedUntil(until);
      } else {
        localStorage.removeItem('alertsPausedUntil');
      }
    }
  }, []);

  // Clear pause when time expires
  useEffect(() => {
    if (!pausedUntil) return;
    
    const timeout = setTimeout(() => {
      setPausedUntil(null);
      localStorage.removeItem('alertsPausedUntil');
      toast({ title: 'Alertas retomados', description: 'O período de pausa terminou.' });
    }, pausedUntil.getTime() - Date.now());

    return () => clearTimeout(timeout);
  }, [pausedUntil]);

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    toggleAlerts,
    pauseFor1Hour,
    pausedUntil,
    isInQuietHours,
    isTemporarilyPaused,
    getStatus,
    canSendNotification,
    AVAILABLE_SOURCES,
    AVAILABLE_TYPES,
  };
}
