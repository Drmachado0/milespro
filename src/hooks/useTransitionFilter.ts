import { useState, useTransition, useCallback, useMemo } from 'react';

interface UseTransitionFilterOptions<T> {
  items: T[];
  filterFn: (item: T, filters: Record<string, unknown>) => boolean;
  initialFilters?: Record<string, unknown>;
}

interface UseTransitionFilterResult<T> {
  filteredItems: T[];
  filters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  isPending: boolean;
}

/**
 * A hook that uses useTransition to make filter operations non-blocking.
 * This prevents the UI from freezing when filtering large datasets.
 */
export function useTransitionFilter<T>({
  items,
  filterFn,
  initialFilters = {},
}: UseTransitionFilterOptions<T>): UseTransitionFilterResult<T> {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);
  const [displayedFilters, setDisplayedFilters] = useState<Record<string, unknown>>(initialFilters);

  const setFilter = useCallback((key: string, value: unknown) => {
    // Update the visible filter immediately for responsive UI
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Defer the expensive filtering operation
    startTransition(() => {
      setDisplayedFilters(prev => ({ ...prev, [key]: value }));
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    startTransition(() => {
      setDisplayedFilters(initialFilters);
    });
  }, [initialFilters]);

  const filteredItems = useMemo(() => {
    return items.filter(item => filterFn(item, displayedFilters));
  }, [items, displayedFilters, filterFn]);

  return {
    filteredItems,
    filters,
    setFilter,
    clearFilters,
    isPending,
  };
}
