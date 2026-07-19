import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { Badge, BadgeRarity } from '@/data/badges';
import { cn } from '@/lib/utils';

// Rarity-driven accent: the medallion gradient + the points pill. Class strings
// are static literals so Tailwind keeps them through purge. Pill colors ship a
// dark variant because the canonical theme is dark (card surface is dark).
const RARITY_STYLES: Record<BadgeRarity, { tile: string; pill: string }> = {
  common: {
    tile: 'from-primary to-amber-500 shadow-primary/30',
    pill: 'bg-primary/10 text-primary',
  },
  rare: {
    tile: 'from-sky-500 to-blue-600 shadow-blue-500/30',
    pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  epic: {
    tile: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
    pill: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  legendary: {
    tile: 'from-amber-400 to-orange-500 shadow-amber-500/40',
    pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

type AchievementBadge = Pick<Badge, 'name' | 'points' | 'icon' | 'rarity'>;

interface AchievementToastProps {
  toastId: string | number;
  badge: AchievementBadge;
}

export const AchievementToast = memo(function AchievementToast({
  toastId,
  badge,
}: AchievementToastProps) {
  const reduceMotion = useReducedMotion();
  const Icon = badge.icon;
  const style = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-3',
        'rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm',
      )}
    >
      {/* Medallion — the badge's own icon, tinted by rarity */}
      <motion.div
        initial={reduceMotion ? false : { scale: 0.5, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 17 }}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          'bg-gradient-to-br text-white shadow-sm',
          style.tile,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </motion.div>

      {/* Copy */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">
          Conquista desbloqueada
        </p>
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {badge.name}
        </p>
      </div>

      {/* Points */}
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
          style.pill,
        )}
      >
        +{badge.points}
      </span>

      {/* Dismiss */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => toast.dismiss(toastId)}
        className={cn(
          'shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

/**
 * Fire the achievement notification. A single compact, on-brand toast per
 * unlocked badge (dedup lives in useBadges). `unstyled` hands full visual
 * control to AchievementToast so Sonner's default card chrome doesn't wrap it.
 */
export function notifyAchievement(badge: AchievementBadge) {
  return toast.custom(
    (id) => <AchievementToast toastId={id} badge={badge} />,
    { duration: 5000, unstyled: true },
  );
}
