import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface HistoryLimitBannerProps {
  className?: string;
}

export function HistoryLimitBanner({ className = '' }: HistoryLimitBannerProps) {
  const navigate = useNavigate();
  const { isFree, limits } = useSubscription();

  if (!isFree) return null;

  return (
    <Alert className={`flex items-center justify-between bg-warning/10 border-warning/20 ${className}`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning dark:text-warning">
          Mostrando últimos {limits.historyDays} dias. Faça upgrade para ver histórico completo.
        </AlertDescription>
      </div>
      <Button 
        size="sm" 
        variant="ghost"
        className="text-warning hover:text-warning hover:bg-warning/10"
        onClick={() => navigate('/assinatura')}
      >
        Upgrade
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </Alert>
  );
}
