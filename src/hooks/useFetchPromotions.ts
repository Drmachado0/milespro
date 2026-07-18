import { useState } from 'react';
import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

interface FetchResult {
  success: boolean;
  found: number;
  inserted: number;
  error?: string;
}

export function useFetchPromotions() {
  const [isFetching, setIsFetching] = useState(false);
  const [lastResult, setLastResult] = useState<FetchResult | null>(null);

  const fetchPromotions = async () => {
    setIsFetching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-promotions');

      if (error) {
        throw error;
      }

      const result = data as FetchResult;
      setLastResult(result);

      if (result.success) {
        toast({
          title: 'Promoções atualizadas!',
          description: `${result.found} encontradas, ${result.inserted} novas inseridas.`,
        });
      } else {
        toast({
          title: 'Erro ao buscar promoções',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }

      return result;
    } catch (err) {
      logger.error('Error fetching promotions:', err);
      const errorMessage = getSafeErrorMessage(err);
      
      toast({
        title: 'Erro ao buscar promoções',
        description: errorMessage,
        variant: 'destructive',
      });

      setLastResult({
        success: false,
        found: 0,
        inserted: 0,
        error: errorMessage,
      });

      return null;
    } finally {
      setIsFetching(false);
    }
  };

  return {
    fetchPromotions,
    isFetching,
    lastResult,
  };
}
