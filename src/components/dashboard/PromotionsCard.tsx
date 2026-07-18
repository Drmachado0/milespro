import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePromotions } from '@/hooks/usePromotions';
import { PromotionType } from '@/types/promotion';
import { 
  AlertTriangle, 
  Gift, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const promotionConfig: Record<PromotionType, {
  icon: typeof AlertTriangle;
  bgClass: string;
  borderClass: string;
  iconClass: string;
}> = {
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-warning/10',
    borderClass: 'border border-warning/30',
    iconClass: 'text-warning',
  },
  promo: {
    icon: Gift,
    bgClass: 'bg-success/10',
    borderClass: 'border border-success/30',
    iconClass: 'text-success',
  },
  income: {
    icon: TrendingUp,
    bgClass: 'bg-info/10',
    borderClass: 'border border-info/30',
    iconClass: 'text-info',
  },
  bonus: {
    icon: Sparkles,
    bgClass: 'bg-violet-500/10',
    borderClass: 'border border-violet-500/30',
    iconClass: 'text-violet-500',
  },
};

export function PromotionsCard() {
  const { promotions, loading, refresh, isLive } = usePromotions();

  const handleClick = (link: string | null | undefined) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Promoções de Milhas</CardTitle>
            {isLive && (
              <div className="flex items-center gap-1 text-xs text-success dark:text-success">
                <Radio className="h-3 w-3 animate-pulse" />
                <span>Ao vivo</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : promotions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma promoção ativa no momento</p>
          </div>
        ) : (
          promotions.map((promotion) => {
            const config = promotionConfig[promotion.type];
            const Icon = config.icon;
            
            return (
              <div
                key={promotion.id}
                onClick={() => handleClick(promotion.link)}
                className={cn(
                  'p-3 rounded-lg transition-all',
                  config.bgClass,
                  config.borderClass,
                  promotion.link && 'cursor-pointer hover:shadow-md hover:scale-[1.01]'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClass)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground">{promotion.title}</p>
                      {promotion.link && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {promotion.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{promotion.description}</p>
                    )}
                    {promotion.source && (
                      <p className="text-xs text-muted-foreground mt-1">Fonte: {promotion.source}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
