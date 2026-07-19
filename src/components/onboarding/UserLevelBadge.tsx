import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getUserLevel, getNextLevel, getLevelProgress } from '@/data/levels';

interface UserLevelBadgeProps {
  points: number;
  compact?: boolean;
}

export const UserLevelBadge = memo(function UserLevelBadge({ 
  points, 
  compact = false 
}: UserLevelBadgeProps) {
  const currentLevel = getUserLevel(points);
  const nextLevel = getNextLevel(points);
  const progress = getLevelProgress(points);
  const Icon = currentLevel.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-full bg-gradient-to-br ${currentLevel.gradient}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-medium">
          Nv.{currentLevel.level}
        </span>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-3 rounded-lg bg-muted/50 border border-border/50"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div 
            className={`p-2 rounded-full bg-gradient-to-br ${currentLevel.gradient} shadow-lg`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Icon className="w-4 h-4 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">Nível {currentLevel.level}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{currentLevel.name}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <motion.span 
            className="text-sm font-bold text-primary"
            key={points}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {points}
          </motion.span>
          {nextLevel && (
            <span className="text-xs text-muted-foreground">/{nextLevel.minPoints} pts</span>
          )}
        </div>
      </div>
      
      {nextLevel && (
        <div className="space-y-1">
          <Progress 
            value={progress.percentage} 
            className="h-1.5" 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Próximo: {nextLevel.name}</span>
            <span>{nextLevel.minPoints - points} pts restantes</span>
          </div>
        </div>
      )}
      
      {!nextLevel && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nível máximo alcançado!</span>
        </div>
      )}
    </motion.div>
  );
});
