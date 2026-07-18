import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription, SubscriptionFeatures } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  inline?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  className,
  inline = false 
}: FeatureGateProps) {
  const { features } = useSubscription();
  const navigate = useNavigate();
  
  const hasAccess = features[feature];
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default upgrade fallback
  if (inline) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-muted-foreground",
        className
      )}>
        <Lock className="h-4 w-4" />
        <span className="text-sm">Recurso Premium</span>
        <Button
          size="sm"
          variant="ghost"
          className="text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
          onClick={() => navigate('/assinatura')}
        >
          Upgrade
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-muted/30 border border-border/50",
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Funcionalidade Premium</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Disponível nos planos Basic e Pro Família. Faça upgrade para desbloquear este recurso.
      </p>
      <Button
        onClick={() => navigate('/assinatura')}
        className="bg-primary hover:bg-primary text-white"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Ver planos
      </Button>
    </div>
  );
}

// Locked card overlay component
interface LockedCardOverlayProps {
  feature: keyof SubscriptionFeatures;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function LockedCardOverlay({ 
  feature, 
  title = "Recurso Premium",
  children, 
  className 
}: LockedCardOverlayProps) {
  const { features } = useSubscription();
  const navigate = useNavigate();
  
  const hasAccess = features[feature];
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return (
    <div className={cn("relative", className)}>
      {children}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-background/70"
        onClick={() => navigate('/assinatura')}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Clique para fazer upgrade</p>
      </div>
    </div>
  );
}
