import { 
  Sprout, 
  Target, 
  Flame, 
  Rocket, 
  Crown, 
  Star,
  Sparkles,
  LucideIcon 
} from 'lucide-react';

export interface UserLevel {
  level: number;
  name: string;
  minPoints: number;
  icon: LucideIcon;
  color: string;
  gradient: string;
}

export const LEVELS: UserLevel[] = [
  { 
    level: 1, 
    name: 'Iniciante', 
    minPoints: 0, 
    icon: Sprout, 
    color: 'slate',
    gradient: 'from-slate-400 to-slate-500'
  },
  { 
    level: 2, 
    name: 'Aprendiz', 
    minPoints: 200, 
    icon: Target, 
    color: 'green',
    gradient: 'from-success to-success/80'
  },
  { 
    level: 3, 
    name: 'Intermediário', 
    minPoints: 500, 
    icon: Flame, 
    color: 'blue',
    gradient: 'from-info to-info/80'
  },
  { 
    level: 4, 
    name: 'Avançado', 
    minPoints: 1000, 
    icon: Rocket, 
    color: 'purple',
    gradient: 'from-violet-400 to-violet-600'
  },
  { 
    level: 5, 
    name: 'Expert', 
    minPoints: 2000, 
    icon: Crown, 
    color: 'orange',
    gradient: 'from-primary to-primary/80'
  },
  { 
    level: 6, 
    name: 'Master', 
    minPoints: 3500, 
    icon: Star, 
    color: 'amber',
    gradient: 'from-warning to-warning/80'
  },
  { 
    level: 7, 
    name: 'Lendário', 
    minPoints: 5000, 
    icon: Sparkles, 
    color: 'primary',
    gradient: 'from-warning via-primary to-destructive'
  },
];

export function getUserLevel(points: number): UserLevel {
  let currentLevel = LEVELS[0];
  
  for (const level of LEVELS) {
    if (points >= level.minPoints) {
      currentLevel = level;
    } else {
      break;
    }
  }
  
  return currentLevel;
}

export function getNextLevel(points: number): UserLevel | null {
  const currentLevel = getUserLevel(points);
  const nextIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  
  return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
}

export function getLevelProgress(points: number): { current: number; next: number; percentage: number } {
  const currentLevel = getUserLevel(points);
  const nextLevel = getNextLevel(points);
  
  if (!nextLevel) {
    return { current: points, next: points, percentage: 100 };
  }
  
  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  const percentage = Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
  
  return { 
    current: points, 
    next: nextLevel.minPoints, 
    percentage: Math.min(percentage, 100) 
  };
}
