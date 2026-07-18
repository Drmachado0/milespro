import { Crown, Infinity as InfinityIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VIPBadgeProps {
  isUnlimited: boolean;
  annualRemaining: number | 'unlimited';
  annualQuota?: number | null;
  status: 'safe' | 'warning' | 'critical' | 'unlimited' | 'inactive';
}

export function VIPBadge({ isUnlimited, annualRemaining, annualQuota, status }: VIPBadgeProps) {
  if (status === 'inactive') return null;

  const getVariant = () => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'unlimited':
      case 'safe':
      default:
        return 'secondary';
    }
  };

  const getStyles = () => {
    switch (status) {
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'warning':
        return 'bg-warning/10 text-warning dark:text-warning border-warning/30';
      case 'unlimited':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'safe':
      default:
        return 'bg-success/10 text-success dark:text-success border-success/30';
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn('text-xs gap-1 font-normal', getStyles())}
    >
      <Crown className="h-3 w-3" />
      {isUnlimited ? (
        <>
          <InfinityIcon className="h-3 w-3" />
          Ilimitada
        </>
      ) : (
        <>
          {annualRemaining}/{annualQuota} restantes
        </>
      )}
    </Badge>
  );
}
