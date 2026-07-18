import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getUserLevel, getNextLevel, getLevelProgress } from '@/data/levels';
import { cn } from '@/lib/utils';

interface LevelProgressHeaderProps {
  totalPoints: number;
}

export const LevelProgressHeader = memo(function LevelProgressHeader({
  totalPoints,
}: LevelProgressHeaderProps) {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const progress = getLevelProgress(totalPoints);
  
  const CurrentIcon = currentLevel.icon;
  const NextIcon = nextLevel?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        'border-2 overflow-hidden',
        'bg-gradient-to-br from-background via-background to-muted/30'
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Current Level Badge */}
            <div className="flex items-center gap-4">
              <motion.div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br',
                  currentLevel.gradient
                )}
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(var(--primary), 0.3)',
                    '0 0 40px rgba(var(--primary), 0.5)',
                    '0 0 20px rgba(var(--primary), 0.3)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CurrentIcon className="w-10 h-10 text-white" />
              </motion.div>
              
              <div>
                <p className="text-sm text-muted-foreground">Nível Atual</p>
                <h2 className={cn('text-2xl font-bold', currentLevel.color)}>
                  {currentLevel.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Nível {currentLevel.level}
                </p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="flex-1">
              {nextLevel ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {totalPoints.toLocaleString('pt-BR')} pts
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        {NextIcon && <NextIcon className={cn('w-4 h-4', nextLevel.color)} />}
                        <span className={cn('text-sm font-medium', nextLevel.color)}>
                          {nextLevel.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {progress.next.toLocaleString('pt-BR')} pts
                    </span>
                  </div>
                  
                  <Progress 
                    value={progress.percentage} 
                    className="h-3 bg-muted"
                  />
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Faltam {(progress.next - progress.current).toLocaleString('pt-BR')} pontos para o próximo nível
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      🎉 Nível Máximo Alcançado!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Você é uma lenda do MilesPro!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
