import { useState, useRef, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { hapticImpact, hapticSuccess } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only start pull if we're at the top of the scroll
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
      hasTriggeredHaptic.current = false;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance to make it feel more natural
    const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
    setPullDistance(resistedDistance);

    // Trigger haptic feedback when threshold is reached
    if (resistedDistance >= threshold && !hasTriggeredHaptic.current) {
      hapticImpact();
      hasTriggeredHaptic.current = true;
    } else if (resistedDistance < threshold) {
      hasTriggeredHaptic.current = false;
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
        hapticSuccess();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto scrollable touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10',
          'transition-opacity duration-200'
        )}
        style={{
          top: -40,
          transform: `translateY(${pullDistance}px)`,
          opacity: progress > 0.1 ? 1 : 0,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full',
            'w-10 h-10 bg-background border shadow-lg',
            shouldTrigger && !isRefreshing && 'border-primary bg-primary/10',
            isRefreshing && 'border-primary bg-primary/10'
          )}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 text-muted-foreground transition-all duration-200',
              shouldTrigger && 'text-primary',
              isRefreshing && 'text-primary animate-spin'
            )}
            style={{
              transform: isRefreshing ? 'rotate(0deg)' : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content wrapper */}
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
