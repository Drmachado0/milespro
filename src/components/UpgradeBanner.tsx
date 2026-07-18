import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

interface UpgradeBannerProps {
  showWhen?: 'always' | 'nearLimit' | 'atLimit';
  className?: string;
  targetPlan?: 'pro' | 'vip';
}

export function UpgradeBanner({
  showWhen = 'nearLimit',
  className = '',
  targetPlan = 'pro'
}: UpgradeBannerProps) {
  const navigate = useNavigate();
  const { isFree, limits, remainingOperations, isLimitReached } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!isFree) return null;

  const usagePercentage = limits.maxOperationsPerMonth 
    ? (limits.currentMonthOperations / limits.maxOperationsPerMonth) * 100 
    : 0;

  // Determine if we should show the banner
  const isNearLimit = usagePercentage >= 80 && !isLimitReached;
  
  if (showWhen === 'nearLimit' && !isNearLimit && !isLimitReached) return null;
  if (showWhen === 'atLimit' && !isLimitReached) return null;

  const getMessage = () => {
    if (isLimitReached) {
      return `Você atingiu o limite de ${limits.maxOperationsPerMonth} operações/mês.`;
    }
    if (isNearLimit) {
      return `Você usou ${limits.currentMonthOperations} de ${limits.maxOperationsPerMonth} operações este mês. Restam ${remainingOperations}.`;
    }
    return `Plano Gratuito: ${limits.currentMonthOperations}/${limits.maxOperationsPerMonth} operações`;
  };

  const planName = targetPlan === 'vip' ? 'VIP' : 'Pro';

  return (
    <Alert 
      variant={isLimitReached ? 'destructive' : 'default'} 
      className={`flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" />
        <AlertDescription>
          {getMessage()}
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant={isLimitReached ? 'secondary' : 'default'}
          className={!isLimitReached ? 'bg-primary hover:bg-primary text-white' : ''}
          onClick={() => navigate('/assinatura')}
        >
          Upgrade para {planName}
        </Button>
        {!isLimitReached && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
