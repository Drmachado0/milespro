import { QueryClient } from '@tanstack/react-query';

/**
 * Detect if running on mobile for optimized caching
 * Uses matchMedia instead of window.innerWidth to avoid forced reflow during module initialization
 */
const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.matchMedia('(max-width: 767px)').matches
);

/**
 * Optimized QueryClient with performance-focused default options
 * Mobile devices get more aggressive caching to reduce network requests
 * - Mobile: 15 minute stale time, 60 minute cache (more aggressive)
 * - Desktop: 5 minute stale time, 10 minute cache
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduced stale time to ensure data freshness after refresh
      staleTime: isMobile ? 5 * 60 * 1000 : 2 * 60 * 1000,
      // Cache data for garbage collection
      gcTime: isMobile ? 30 * 60 * 1000 : 10 * 60 * 1000,
      // Don't refetch when window regains focus (reduces unnecessary requests)
      refetchOnWindowFocus: false,
      // Refetch when reconnecting to ensure fresh data
      refetchOnReconnect: true,
      // Always refetch on mount to ensure data is loaded after navigation/refresh
      refetchOnMount: true,
      // Use online mode to prioritize network over empty cache
      networkMode: 'online',
      // Retry failed requests with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('401')) return false;
        if (error instanceof Error && error.message.includes('403')) return false;
        if (error instanceof Error && error.message.includes('404')) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});

/**
 * Standard query keys for consistency across the app
 * Using object format allows for easier query invalidation
 */
export const queryKeys = {
  operations: {
    all: ['operations'] as const,
    list: (filters?: { status?: string; program?: string }) => 
      ['operations', 'list', filters] as const,
    detail: (id: string) => ['operations', 'detail', id] as const,
  },
  holders: {
    all: ['holders'] as const,
    detail: (id: string) => ['holders', 'detail', id] as const,
  },
  programBalances: {
    all: ['program_balances'] as const,
    byProgram: (program: string) => ['program_balances', program] as const,
  },
  marketPrices: {
    all: ['market_prices'] as const,
    byProgram: (program: string) => ['market_prices', program] as const,
  },
  clubSubscriptions: {
    all: ['club_subscriptions'] as const,
  },
  creditCards: {
    all: ['credit_cards'] as const,
    detail: (id: string) => ['credit_cards', 'detail', id] as const,
  },
  priceAlerts: {
    all: ['price_alerts'] as const,
  },
  accumulationGoals: {
    all: ['accumulation_goals'] as const,
  },
  travelClients: {
    all: ['travel_clients'] as const,
    detail: (id: string) => ['travel_clients', 'detail', id] as const,
  },
  travelTickets: {
    all: ['travel_tickets'] as const,
  },
  travelHotels: {
    all: ['travel_hotel_reservations'] as const,
  },
  travelCars: {
    all: ['travel_car_rentals'] as const,
  },
  travelQuotes: {
    all: ['travel_quotes'] as const,
  },
  travelReceivables: {
    all: ['travel_receivables'] as const,
  },
  subscription: {
    current: ['user_subscription'] as const,
  },
  pendingBonuses: {
    all: ['pending_bonuses'] as const,
  },
  promotions: {
    all: ['promotions'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    pending: () => ['tasks', 'pending'] as const,
    completed: () => ['tasks', 'completed'] as const,
  },
  profile: {
    all: ['profile'] as const,
    current: ['profile', 'current'] as const,
  },
} as const;
