import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { UserLevel } from '@/data/levels';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  totalPoints: number;
  unlockedCount: number;
  totalBadges: number;
  legendaryCount: number;
  epicCount: number;
  currentLevel: UserLevel;
}

export const StatsCards = memo(function StatsCards({
  totalPoints,
  unlockedCount,
  totalBadges,
  legendaryCount,
  epicCount,
  currentLevel,
}: StatsCardsProps) {
  const LevelIcon = currentLevel.icon;
  
  const stats = [
    {
      label: 'Pontos Totais',
      value: totalPoints.toLocaleString('pt-BR'),
      icon: Trophy,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Badges Desbloqueados',
      value: `${unlockedCount}/${totalBadges}`,
      icon: Medal,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Épicos & Lendários',
      value: `${epicCount + legendaryCount}`,
      icon: Star,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      label: 'Nível Atual',
      value: currentLevel.name,
      icon: LevelIcon,
      color: currentLevel.color,
      bgColor: `${currentLevel.color.replace('text-', 'bg-')}/10`,
      customBg: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Card className="border-border/50 hover:border-border transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    stat.customBg ? 'bg-primary/10' : stat.bgColor
                  )}
                >
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
});
