import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Badge, RARITY_COLORS } from '@/data/badges';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BadgeIconProps {
  badge: Badge;
  isUnlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 28,
};

export const BadgeIcon = memo(function BadgeIcon({
  badge,
  isUnlocked,
  size = 'md',
  onClick,
  showTooltip = true,
}: BadgeIconProps) {
  const Icon = badge.icon;
  const colors = RARITY_COLORS[badge.rarity];

  const content = (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative rounded-full flex items-center justify-center transition-all cursor-pointer',
        sizeClasses[size],
        isUnlocked
          ? cn(
              'bg-gradient-to-br',
              colors.bg,
              'shadow-lg',
              colors.glow,
              'border-2',
              colors.border
            )
          : 'bg-muted border-2 border-muted-foreground/20'
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={false}
      animate={
        isUnlocked
          ? {
              boxShadow: [
                '0 0 0px rgba(255,255,255,0)',
                '0 0 20px rgba(255,255,255,0.3)',
                '0 0 0px rgba(255,255,255,0)',
              ],
            }
          : {}
      }
      transition={
        isUnlocked
          ? {
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
          : {}
      }
    >
      {isUnlocked ? (
        <Icon
          size={iconSizes[size]}
          className="text-white drop-shadow-md"
        />
      ) : (
        <>
          <Icon
            size={iconSizes[size]}
            className="text-muted-foreground/40"
          />
          <div className="absolute -bottom-0.5 -right-0.5 bg-muted rounded-full p-0.5 border border-muted-foreground/20">
            <Lock size={size === 'sm' ? 8 : size === 'md' ? 10 : 12} className="text-muted-foreground/60" />
          </div>
        </>
      )}
    </motion.button>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="text-center">
            <p className="font-semibold">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
            {isUnlocked && (
              <p className="text-xs text-primary mt-1">+{badge.points} pts</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
