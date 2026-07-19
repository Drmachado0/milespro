import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Badge, RARITY_COLORS, RARITY_LABELS } from '@/data/badges';
import { cn } from '@/lib/utils';

interface BadgeDetailModalProps {
  badge: Badge | null;
  isUnlocked: boolean;
  isOpen: boolean;
  onClose: () => void;
  unlockedAt?: string;
}

export const BadgeDetailModal = memo(function BadgeDetailModal({
  badge,
  isUnlocked,
  isOpen,
  onClose,
  unlockedAt,
}: BadgeDetailModalProps) {
  if (!badge) return null;

  const Icon = badge.icon;
  const colors = RARITY_COLORS[badge.rarity];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader className="sr-only">
          <DialogTitle>{badge.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center py-4 space-y-4">
          {/* Large badge icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={badge.id}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center',
                isUnlocked
                  ? cn('bg-gradient-to-br', colors.bg, 'shadow-xl', colors.glow)
                  : 'bg-muted'
              )}
            >
              <Icon
                size={48}
                className={cn(
                  isUnlocked ? 'text-white' : 'text-muted-foreground/40'
                )}
              />
            </motion.div>
          </AnimatePresence>

          {/* Badge name */}
          <div>
            <h3 className="text-xl font-bold">{badge.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {badge.description}
            </p>
          </div>

          {/* Points and rarity */}
          <div className="flex items-center gap-3">
            <motion.div
              className="text-lg font-bold text-primary font-mono tabular-nums tracking-tight"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              +{badge.points} pts
            </motion.div>
            <BadgeComponent
              variant="outline"
              className={cn(
                'capitalize',
                badge.rarity === 'legendary' && 'border-warning text-warning',
                badge.rarity === 'epic' && 'border-violet-400 text-violet-600',
                badge.rarity === 'rare' && 'border-info text-info',
                badge.rarity === 'common' && 'border-slate-400 text-slate-600'
              )}
            >
              {RARITY_LABELS[badge.rarity]}
            </BadgeComponent>
          </div>

          {/* Unlock status */}
          {isUnlocked ? (
            <p className="text-sm text-muted-foreground">
              Desbloqueado{' '}
              {unlockedAt &&
                `em ${format(new Date(unlockedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Complete a etapa para desbloquear
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
