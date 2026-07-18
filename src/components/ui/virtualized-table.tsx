import { useRef, useMemo, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps<T> {
  data: T[];
  rowHeight?: number;
  overscan?: number;
  className?: string;
  renderRow: (item: T, index: number) => ReactNode;
  renderHeader?: () => ReactNode;
  emptyMessage?: string;
  maxHeight?: number | string;
}

/**
 * A virtualized table component that only renders visible rows.
 * Dramatically improves performance for tables with 100+ rows.
 */
export function VirtualizedTable<T>({
  data,
  rowHeight = 56,
  overscan = 5,
  className,
  renderRow,
  renderHeader,
  emptyMessage = 'Nenhum item encontrado',
  maxHeight = 600,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {renderHeader && (
        <div className="bg-muted/50 border-b border-border">
          {renderHeader()}
        </div>
      )}
      <div
        ref={parentRef}
        className="overflow-auto scrollable"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use virtualization in custom table implementations
 */
export function useTableVirtualization<T>(
  data: T[],
  options?: {
    rowHeight?: number;
    overscan?: number;
  }
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { rowHeight = 56, overscan = 5 } = options || {};

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  const visibleData = useMemo(() => {
    return virtualItems.map((virtualRow) => ({
      item: data[virtualRow.index],
      index: virtualRow.index,
      style: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      },
      key: virtualRow.key,
    }));
  }, [virtualItems, data]);

  return {
    parentRef,
    virtualizer,
    totalHeight,
    visibleData,
    virtualItems,
  };
}
