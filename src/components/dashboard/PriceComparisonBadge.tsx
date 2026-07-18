import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useLocalization } from '@/hooks/useLocalization';

interface PriceComparisonBadgeProps {
  program: string;
  userCost: number;
  showDetails?: boolean;
}

export function PriceComparisonBadge({ 
  program, 
  userCost, 
  showDetails = false 
}: PriceComparisonBadgeProps) {
  const { getPriceComparison, isLoading } = useMarketPrices();
  const { formatCurrency } = useLocalization();

  if (isLoading || !userCost) return null;

  const comparison = getPriceComparison(program, userCost);
  if (!comparison) return null;

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; className: string; icon: typeof TrendingUp }> = {
    excellent: {
      label: 'Excelente',
      variant: 'default',
      className: 'bg-success hover:bg-success',
      icon: TrendingDown,
    },
    good: {
      label: 'Bom',
      variant: 'default',
      className: 'bg-info hover:bg-info',
      icon: TrendingDown,
    },
    fair: {
      label: 'Razoável',
      variant: 'secondary',
      className: '',
      icon: Minus,
    },
    high: {
      label: 'Alto',
      variant: 'destructive',
      className: '',
      icon: TrendingUp,
    },
  };

  const config = statusConfig[comparison.status] ?? statusConfig.fair;
  const Icon = config.icon;

  const badge = (
    <Badge variant={config.variant} className={`${config.className} text-xs`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );

  if (!showDetails) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-medium">Comparação com mercado</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Seu custo:</span>
            <span className="font-medium">{formatCurrency(comparison.userCost)}</span>
            <span className="text-muted-foreground">Mercado (compra):</span>
            <span className="text-success">{formatCurrency(comparison.marketBuy)}</span>
            <span className="text-muted-foreground">Mercado (venda):</span>
            <span className="text-warning">{formatCurrency(comparison.marketSell)}</span>
            <span className="text-muted-foreground">Diferença:</span>
            <span className={comparison.isBelowMarket ? 'text-success' : 'text-destructive'}>
              {comparison.percentDiff > 0 ? '+' : ''}{comparison.percentDiff.toFixed(1)}%
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
