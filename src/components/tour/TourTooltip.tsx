import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { TourTooltip as TourTooltipType } from '@/data/tourSteps';
import { cn } from '@/lib/utils';

interface Position {
  top: number;
  left: number;
}

interface TourTooltipProps {
  tooltip: TourTooltipType;
  isVisible: boolean;
}

function calculatePosition(
  rect: DOMRect,
  position: TourTooltipType['position'],
  tooltipWidth: number = 280,
  tooltipHeight: number = 60
): Position {
  const gap = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'top':
      top = rect.top - tooltipHeight - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + gap;
      break;
  }

  // Keep within viewport bounds
  if (left < 10) left = 10;
  if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
  if (top < 10) top = 10;
  if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;

  return { top, left };
}

const arrowStyles: Record<TourTooltipType['position'], string> = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-primary',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-primary',
  left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
  right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
};

export function TourTooltip({ tooltip, isVisible }: TourTooltipProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(tooltip.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        const tooltipHeight = tooltipRef.current?.offsetHeight || 60;
        const tooltipWidth = tooltipRef.current?.offsetWidth || 280;
        
        setPosition(calculatePosition(rect, tooltip.position, tooltipWidth, tooltipHeight));
        
        // Add highlight to the element
        element.setAttribute('data-tour-highlight', 'true');
      }
    };

    if (!isVisible) return;
    // Small delay to ensure the page has rendered
    const timeoutId = setTimeout(updatePosition, 100);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      
      // Remove highlight
      const element = document.querySelector(tooltip.targetSelector);
      if (element) {
        element.removeAttribute('data-tour-highlight');
      }
    };
  }, [tooltip, isVisible]);

  return (
    <AnimatePresence>
      {isVisible && targetRect && (
        <motion.div
          ref={tooltipRef}
          className="fixed z-[102] max-w-[280px] bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-xl"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-sm font-medium">{tooltip.message}</p>
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-[8px]',
              arrowStyles[tooltip.position]
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
