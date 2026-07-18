import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StartTourButtonProps {
  onClick: () => void;
  hasCompletedTour: boolean;
  variant?: 'icon' | 'full';
}

export const StartTourButton = memo(function StartTourButton({
  onClick,
  hasCompletedTour,
  variant = 'icon'
}: StartTourButtonProps) {
  if (variant === 'full') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={onClick}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Compass size={16} />
          {hasCompletedTour ? 'Repetir Tour' : 'Iniciar Tour Guiado'}
        </Button>
      </motion.div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
        >
          <Compass size={18} />
          {!hasCompletedTour && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full"
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {hasCompletedTour ? 'Repetir tour guiado' : 'Iniciar tour guiado'}
      </TooltipContent>
    </Tooltip>
  );
});
