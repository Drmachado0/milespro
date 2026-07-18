import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarketPrice {
  id?: string;
  program: string;
  buy_price: number;
  sell_price: number;
  source: string;
  fetched_at: string;
}

export function useMarketPrices() {
  const queryClient = useQueryClient();

  const { data: prices, isLoading, error } = useQuery({
    queryKey: ['market-prices'],
    queryFn: async (): Promise<MarketPrice[]> => {
      const { data, error } = await supabase.functions.invoke('fetch-market-prices', {
        body: { action: 'fetch-all' },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch prices');
      
      return data.prices;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-market-prices', {
        body: { action: 'refresh' },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to refresh prices');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
    },
  });

  const getPrice = (program: string): MarketPrice | undefined => {
    return prices?.find(p => p.program === program);
  };

  const getPriceComparison = (program: string, userCost: number) => {
    const marketPrice = getPrice(program);
    if (!marketPrice) return null;

    const avgMarketPrice = (marketPrice.buy_price + marketPrice.sell_price) / 2;
    const difference = userCost - avgMarketPrice;
    const percentDiff = ((userCost - avgMarketPrice) / avgMarketPrice) * 100;

    return {
      marketBuy: marketPrice.buy_price,
      marketSell: marketPrice.sell_price,
      avgMarket: avgMarketPrice,
      userCost,
      difference,
      percentDiff,
      isBelowMarket: userCost < avgMarketPrice,
      status: userCost < marketPrice.buy_price ? 'excellent' : 
              userCost <= avgMarketPrice ? 'good' : 
              userCost <= marketPrice.sell_price ? 'fair' : 'high',
    };
  };

  return {
    prices,
    isLoading,
    error,
    refreshPrices: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    getPrice,
    getPriceComparison,
  };
}

export function useMarketPrice(program: string) {
  return useQuery({
    queryKey: ['market-price', program],
    queryFn: async (): Promise<MarketPrice> => {
      const { data, error } = await supabase.functions.invoke('fetch-market-prices', {
        body: { action: 'get-price', program },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch price');
      
      return data.price;
    },
    enabled: !!program,
    staleTime: 5 * 60 * 1000,
  });
}
