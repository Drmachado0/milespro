import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface ProgramLimitBadgeProps {
  className?: string;
}

export function ProgramLimitBadge({ className = '' }: ProgramLimitBadgeProps) {
  const { isFree, limits, canAddProgram } = useSubscription();

  if (!isFree) return null;

  return (
    <Badge 
      variant={canAddProgram ? 'secondary' : 'destructive'}
      className={`gap-1 ${className}`}
    >
      {!canAddProgram && <Lock className="h-3 w-3" />}
      {limits.currentProgramsCount}/{limits.maxPrograms} programas
    </Badge>
  );
}
