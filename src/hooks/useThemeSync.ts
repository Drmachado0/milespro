import { useEffect, useRef } from 'react';
import { logger } from "@/lib/logger";
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useThemeSync() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const initialLoadDone = useRef(false);
  const isUpdating = useRef(false);

  // Load theme from database on mount
  useEffect(() => {
    async function loadThemeFromDb() {
      if (!user?.id || initialLoadDone.current) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.theme) {
          setTheme(data.theme);
        }
        initialLoadDone.current = true;
      } catch (err) {
        logger.error('Error loading theme preference:', err);
      }
    }

    loadThemeFromDb();
  }, [user?.id, setTheme]);

  // Save theme to database when it changes (debounced to avoid flicker)
  useEffect(() => {
    if (!theme || !initialLoadDone.current || !user?.id) return;

    const timeoutId = setTimeout(async () => {
      if (isUpdating.current) return;
      isUpdating.current = true;
      try {
        await supabase
          .from('profiles')
          .update({ theme })
          .eq('id', user.id);
      } catch (err) {
        logger.error('Error saving theme preference:', err);
      } finally {
        isUpdating.current = false;
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [theme, user?.id]);

  return { theme, setTheme, resolvedTheme };
}
