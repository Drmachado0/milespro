import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TourTooltip } from './TourTooltip';
import { TourTooltip as TourTooltipType, TourStep } from '@/data/tourSteps';

interface TourTooltipsProps {
  currentStep: TourStep | null;
  isActive: boolean;
}

export function TourTooltips({ currentStep, isActive }: TourTooltipsProps) {
  const [visibleTooltips, setVisibleTooltips] = useState<Set<string>>(new Set());
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!isActive || !currentStep?.tooltips?.length) {
      setVisibleTooltips(new Set());
      setShowOverlay(false);
      return;
    }

    // Show overlay after a small delay
    const overlayTimeout = setTimeout(() => {
      setShowOverlay(true);
    }, 300);

    // Show tooltips sequentially with staggered delays
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    
    currentStep.tooltips.forEach((tooltip, index) => {
      const timeout = setTimeout(() => {
        setVisibleTooltips(prev => new Set([...prev, tooltip.id]));
      }, 500 + index * 200);
      timeouts.push(timeout);
    });

    return () => {
      clearTimeout(overlayTimeout);
      timeouts.forEach(clearTimeout);
      setVisibleTooltips(new Set());
      setShowOverlay(false);
      
      // Clean up all highlights when changing steps
      document.querySelectorAll('[data-tour-highlight]').forEach(el => {
        el.removeAttribute('data-tour-highlight');
      });
    };
  }, [currentStep, isActive]);

  if (!isActive || !currentStep?.tooltips?.length) {
    return null;
  }

  return (
    <>
      {/* Semi-transparent overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="fixed inset-0 bg-background/60 backdrop-blur-[2px] z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Tooltips */}
      {currentStep.tooltips.map((tooltip) => (
        <TourTooltip
          key={tooltip.id}
          tooltip={tooltip}
          isVisible={visibleTooltips.has(tooltip.id)}
        />
      ))}
    </>
  );
}
