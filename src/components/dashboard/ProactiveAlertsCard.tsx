import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
import { useMemo } from 'react';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useExpirationAlerts } from '@/hooks/useExpirationAlerts';
import { useAccumulationGoals } from '@/hooks/useAccumulationGoals';
import { useProductTier } from '@/hooks/useProductTier';
import { cn } from '@/lib/utils';

interface ProactiveAlert {
  id: string;
  type: 'opportunity' | 'warning' | 'goal' | 'tip';
  title: string;
  description: string;
  action?: {
    label: string;
    path: string;
  };
  priority: number;
}

const alertStyles = {
  opportunity: {
    bg: 'bg-gradient-to-r from-success/10 to-transparent',
    border: 'border border-success/30',
    iconBg: 'bg-success/20',
    iconColor: 'text-success',
    badgeBg: 'bg-success text-success dark:bg-success/20 dark:text-success',
  },
  warning: {
    bg: 'bg-gradient-to-r from-warning/10 to-transparent',
    border: 'border border-warning/30',
    iconBg: 'bg-warning/20',
    iconColor: 'text-warning',
    badgeBg: 'bg-warning text-warning dark:bg-warning/20 dark:text-warning',
  },
  goal: {
    bg: 'bg-gradient-to-r from-info/10 to-transparent',
    border: 'border border-info/30',
    iconBg: 'bg-info/20',
    iconColor: 'text-info',
    badgeBg: 'bg-info text-info dark:bg-info/20 dark:text-info',
  },
  tip: {
    bg: 'bg-gradient-to-r from-violet-500/10 to-transparent',
    border: 'border border-violet-500/30',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-500',
    badgeBg: 'bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 dark:text-violet-400',
  },
};

export function ProactiveAlertsCard() {
  const navigate = useNavigate();
  const { formatCurrency, formatNumber, t } = useLocalization();
  const { balances } = useProgramBalances();
  const { prices } = useMarketPrices();
  const { criticalExpirations } = useExpirationAlerts();
  const { goals } = useAccumulationGoals();
  const { hasTier } = useProductTier();

  // Generate proactive alerts based on current data
  const alerts = useMemo((): ProactiveAlert[] => {
    const generatedAlerts: ProactiveAlert[] = [];

    // Check for buying opportunities (user cost > market sell price = good time to sell)
    balances.forEach(balance => {
      const marketPrice = prices?.find(p => p.program === balance.program);
      if (marketPrice && balance.averageCost) {
        const userCostPerThousand = balance.averageCost;
        const marketSellPrice = marketPrice.sell_price;

        // Sell-opportunity suggestion points at the Pro+ sale flow (/agencia/venda);
        // suppress it for Starter, which has no personal sale page yet.
        if (marketSellPrice > userCostPerThousand * 1.15 && balance.balance >= 10000 && hasTier('pro')) {
          const profit = (marketSellPrice - userCostPerThousand) * (balance.balance / 1000);
          generatedAlerts.push({
            id: `sell-${balance.program}`,
            type: 'opportunity',
            title: `${t('proactiveAlerts.sellOpportunity')}: ${balance.program}`,
            description: `${t('proactiveAlerts.potentialProfit')}: ${formatCurrency(profit)} (${formatNumber(balance.balance)} ${t('common.miles').toLowerCase()})`,
            action: {
              label: t('operations.sale'),
              path: '/agencia/venda'
            },
            priority: profit
          });
        }

        // If market buy price is lower than average cost (good time to buy more)
        const marketBuyPrice = marketPrice.buy_price;
        if (marketBuyPrice < userCostPerThousand * 0.9) {
          generatedAlerts.push({
            id: `buy-${balance.program}`,
            type: 'tip',
            title: `${t('proactiveAlerts.buyOpportunity')}: ${balance.program}`,
            description: `${t('proactiveAlerts.marketPrice')} ${formatCurrency(marketBuyPrice)}/mil (${t('proactiveAlerts.belowYourAverage')})`,
            action: {
              label: t('operations.purchase'),
              path: '/lancamentos/compra'
            },
            priority: (userCostPerThousand - marketBuyPrice) * 100
          });
        }
      }
    });

    // Critical expiration warnings
    criticalExpirations.forEach(exp => {
      generatedAlerts.push({
        id: `expire-${exp.program}`,
        type: 'warning',
        title: `${exp.program}: ${formatNumber(exp.expiringMiles)} ${t('proactiveAlerts.expiringSoon')}`,
        description: `${t('proactiveAlerts.expiresIn')} ${exp.daysUntilExpiry} ${t('common.days')}`,
        action: {
          label: t('proactiveAlerts.useNow'),
          path: '/lancamentos/passagem-emitida'
        },
        priority: 1000 - exp.daysUntilExpiry * 10
      });
    });

    // Goals close to completion
    goals.filter(g => !g.completed).forEach(goal => {
      const progress = (goal.current_quantity / goal.target_quantity) * 100;
      if (progress >= 80 && progress < 100) {
        const remaining = goal.target_quantity - goal.current_quantity;
        generatedAlerts.push({
          id: `goal-${goal.id}`,
          type: 'goal',
          title: `${goal.program}: ${t('proactiveAlerts.almostThere')}!`,
          description: `${t('proactiveAlerts.only')} ${formatNumber(remaining)} ${t('common.miles').toLowerCase()} ${t('proactiveAlerts.toReachGoal')}`,
          action: {
            label: t('operations.purchase'),
            path: '/lancamentos/compra'
          },
          priority: progress
        });
      }
    });

    // Sort by priority and take top 4
    return generatedAlerts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
  }, [balances, prices, criticalExpirations, goals, formatCurrency, formatNumber, t, hasTier]);

  const getAlertIcon = (type: ProactiveAlert['type']) => {
    const style = alertStyles[type];
    switch (type) {
      case 'opportunity':
        return <TrendingUp className={cn('h-4 w-4', style.iconColor)} />;
      case 'warning':
        return <Clock className={cn('h-4 w-4', style.iconColor)} />;
      case 'goal':
        return <Target className={cn('h-4 w-4', style.iconColor)} />;
      case 'tip':
        return <TrendingDown className={cn('h-4 w-4', style.iconColor)} />;
    }
  };

  const getAlertTypeName = (type: ProactiveAlert['type']) => {
    switch (type) {
      case 'opportunity':
        return t('proactiveAlerts.opportunity');
      case 'warning':
        return t('proactiveAlerts.warning');
      case 'goal':
        return t('proactiveAlerts.goal');
      case 'tip':
        return t('proactiveAlerts.tip');
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Lightbulb className="h-4 w-4 text-warning" />
            </div>
            {t('proactiveAlerts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('proactiveAlerts.noAlerts')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Estamos monitorando suas oportunidades
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-warning/10">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          {t('proactiveAlerts.title')}
          <Badge variant="secondary" className="ml-auto text-xs font-semibold">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const style = alertStyles[alert.type];
          return (
            <div 
              key={alert.id}
              className={cn(
                'p-3 rounded-lg transition-all duration-200 hover:shadow-md animate-fade-in',
                style.bg,
                style.border
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', style.iconBg)}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] px-1.5 py-0 border-0', style.badgeBg)}>
                      {getAlertTypeName(alert.type)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {alert.description}
                  </p>
                  {alert.action && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-2 text-xs font-semibold"
                      onClick={() => navigate(alert.action!.path)}
                    >
                      {alert.action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
