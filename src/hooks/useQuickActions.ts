import { useState, useEffect, useCallback } from 'react';
import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProductTier } from '@/hooks/useProductTier';
import { DEFAULT_QUICK_ACTIONS, getActionsByIds, filterQuickActionsByTier, QuickActionDefinition, MAX_QUICK_ACTIONS, MIN_QUICK_ACTIONS } from '@/data/quickActionsRegistry';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function useQuickActions() {
  const { user } = useAuth();
  const { productTier } = useProductTier();
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(DEFAULT_QUICK_ACTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user's quick actions from database
  useEffect(() => {
    async function loadQuickActions() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('quick_actions')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.quick_actions && Array.isArray(data.quick_actions) && data.quick_actions.length > 0) {
          setSelectedActionIds(data.quick_actions);
        } else {
          setSelectedActionIds(DEFAULT_QUICK_ACTIONS);
        }
      } catch (error) {
        logger.error('Error loading quick actions:', error);
        setSelectedActionIds(DEFAULT_QUICK_ACTIONS);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuickActions();
  }, [user?.id]);

  // Save quick actions to database
  const saveQuickActions = useCallback(async (actionIds: string[]) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ quick_actions: actionIds })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Ações rápidas salvas!');
    } catch (error) {
      logger.error('Error saving quick actions:', error);
      toast.error('Erro ao salvar ações rápidas');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Update actions and save
  const updateActions = useCallback((newActionIds: string[]) => {
    if (newActionIds.length < MIN_QUICK_ACTIONS) {
      toast.error(`Selecione pelo menos ${MIN_QUICK_ACTIONS} ações`);
      return false;
    }
    if (newActionIds.length > MAX_QUICK_ACTIONS) {
      toast.error(`Máximo de ${MAX_QUICK_ACTIONS} ações permitido`);
      return false;
    }
    
    setSelectedActionIds(newActionIds);
    saveQuickActions(newActionIds);
    return true;
  }, [saveQuickActions]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setSelectedActionIds(DEFAULT_QUICK_ACTIONS);
    saveQuickActions(DEFAULT_QUICK_ACTIONS);
  }, [saveQuickActions]);

  // Toggle a single action
  const toggleAction = useCallback((actionId: string) => {
    setSelectedActionIds(prev => {
      const isSelected = prev.includes(actionId);
      let newIds: string[];
      
      if (isSelected) {
        if (prev.length <= MIN_QUICK_ACTIONS) {
          toast.error(`Mínimo de ${MIN_QUICK_ACTIONS} ações`);
          return prev;
        }
        newIds = prev.filter(id => id !== actionId);
      } else {
        if (prev.length >= MAX_QUICK_ACTIONS) {
          toast.error(`Máximo de ${MAX_QUICK_ACTIONS} ações`);
          return prev;
        }
        newIds = [...prev, actionId];
      }
      
      return newIds;
    });
  }, []);

  // Reorder actions
  const reorderActions = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedActionIds(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  // Get the action definitions for selected IDs, then drop any above the user's
  // product tier (e.g. a Starter whose saved list still contains 'venda').
  const actions = filterQuickActionsByTier(getActionsByIds(selectedActionIds), productTier);

  return {
    actions,
    selectedActionIds,
    isLoading,
    isSaving,
    updateActions,
    resetToDefault,
    toggleAction,
    reorderActions,
    saveQuickActions,
  };
}
