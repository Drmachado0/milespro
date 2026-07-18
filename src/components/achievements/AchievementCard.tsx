import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, ExternalLink, Hourglass } from 'lucide-react';
import { Badge, RARITY_COLORS, RARITY_LABELS, isMonetaryMetric } from '@/data/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AchievementCardProps {
  badge: Badge;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; target: number };
  hasShortcut?: boolean;
  onClick: () => void;
}

// Three discrete visual states so the user can scan a grid and tell
// conquistado / em progresso / bloqueado apart at a glance (sas.txt P3).
// 'in_progress' covers milestone badges where the user has measurable
// progress but hasn't hit the threshold yet.
type AchievementStatus = 'unlocked' | 'in_progress' | 'locked';

const STATUS_LABELS: Record<AchievementStatus, string> = {
  unlocked: 'Conquistado',
  in_progress: 'Em progresso',
  locked: 'Bloqueado',
};

export const AchievementCard = memo(function AchievementCard({
  badge,
  isUnlocked,
  unlockedAt,
  progress,
  hasShortcut,
  onClick,
}: AchievementCardProps) {
  const Icon = badge.icon;
  const rarityStyle = RARITY_COLORS[badge.rarity];
  const rarityLabel = RARITY_LABELS[badge.rarity];

  const progressPercentage = progress
    ? Math.min((progress.current / progress.target) * 100, 100)
    : 0;

  const status: AchievementStatus = isUnlocked
    ? 'unlocked'
    : progress && progress.current > 0
      ? 'in_progress'
      : 'locked';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300 overflow-hidden h-full',
          status === 'unlocked' &&
            `${rarityStyle.border} ${rarityStyle.glow} hover:shadow-lg`,
          status === 'in_progress' &&
            'border-dashed border-primary/40 hover:border-primary/70 hover:shadow-md',
          status === 'locked' &&
            'border-border/40 opacity-50 grayscale hover:opacity-70 hover:grayscale-0',
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 relative">
          {/* Status pill — top-left so user scans state before content */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full',
                status === 'unlocked' && 'bg-success/15 text-success border border-success/30',
                status === 'in_progress' && 'bg-primary/10 text-primary border border-primary/30',
                status === 'locked' && 'bg-muted text-muted-foreground border border-border',
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          {/* Shortcut indicator */}
          {hasShortcut && (
            <div className="absolute top-2 right-2">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex items-start gap-3 pt-6">
            {/* Icon Container */}
            <div
              className={cn(
                'relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center',
                status === 'unlocked' && `bg-gradient-to-br ${rarityStyle.bg}`,
                status === 'in_progress' && 'bg-primary/10 border border-primary/30',
                status === 'locked' && 'bg-muted',
              )}
            >
              <Icon
                className={cn(
                  'w-7 h-7',
                  status === 'unlocked' && 'text-foreground',
                  status === 'in_progress' && 'text-primary',
                  status === 'locked' && 'text-muted-foreground',
                )}
              />
              {status === 'unlocked' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {status === 'in_progress' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Hourglass className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              {status === 'locked' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/50 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-muted" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={cn(
                    'font-semibold text-sm truncate',
                    status === 'unlocked' && 'text-foreground',
                    status === 'in_progress' && 'text-foreground',
                    status === 'locked' && 'text-muted-foreground',
                  )}
                >
                  {badge.name}
                </h3>
              </div>

              <p
                className={cn(
                  'text-xs line-clamp-2 mb-2',
                  status === 'unlocked' && 'text-muted-foreground',
                  status === 'in_progress' && 'text-muted-foreground',
                  status === 'locked' && 'text-muted-foreground/70',
                )}
              >
                {badge.description}
              </p>

              {/* Rarity and Points */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    status === 'unlocked' && `bg-gradient-to-br ${rarityStyle.bg} text-foreground`,
                    status === 'in_progress' && 'bg-primary/10 text-primary',
                    status === 'locked' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {rarityLabel}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    status === 'unlocked' && 'text-primary',
                    status === 'in_progress' && 'text-foreground',
                    status === 'locked' && 'text-muted-foreground',
                  )}
                >
                  +{badge.points} pts
                </span>
              </div>

              {/* Progress Bar for Milestones */}
              {status === 'in_progress' && progress && badge.condition.type === 'milestone' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-foreground font-medium">
                      {badge.condition.milestone && isMonetaryMetric(badge.condition.milestone.metric) 
                        ? `R$ ${progress.current.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / R$ ${progress.target.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : `${progress.current.toLocaleString('pt-BR')} / ${progress.target.toLocaleString('pt-BR')}`
                      }
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5" />
                </div>
              )}

              {/* Unlocked Date */}
              {isUnlocked && unlockedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Conquistado em {format(new Date(unlockedAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
