import { useQuery } from '@tanstack/react-query';
import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRateData {
  rate: number;
  source: string;
  timestamp: string;
}

export function useExchangeRate() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: async (): Promise<ExchangeRateData> => {
      const { data, error } = await supabase.functions.invoke('get-exchange-rate');
      
      if (error) {
        logger.error('Exchange rate fetch error:', error);
        // Return fallback
        return { rate: 5.50, source: 'fallback', timestamp: new Date().toISOString() };
      }
      
      return {
        rate: data.rate || 5.50,
        source: data.source || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    rate: data?.rate ?? 5.50,
    source: data?.source ?? 'fallback',
    timestamp: data?.timestamp,
    isLoading,
    error,
    refetch,
  };
}
