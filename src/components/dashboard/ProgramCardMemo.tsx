import { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ProgramBalance } from '@/hooks/useProgramBalances';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramCardProps {
  program: ProgramBalance;
  marketPrice?: number;
}

function ProgramCardBase({ program, marketPrice }: ProgramCardProps) {
  const navigate = useNavigate();
  const { formatCurrency, formatNumber } = useLocalization();
  
  // Use market price if available, otherwise fallback to R$20/mil
  const pricePerMil = marketPrice ?? 20;
  const estimatedValue = program.balance * (pricePerMil / 1000);
  
  // Determine if cost is good or bad compared to market
  const costTrend = marketPrice 
    ? program.averageCost < marketPrice * 0.9 
      ? 'good' 
      : program.averageCost > marketPrice * 1.1 
        ? 'bad' 
        : 'neutral'
    : 'neutral';

  const handleClick = useCallback(() => {
    navigate(`/programa/${encodeURIComponent(program.program)}`);
  }, [navigate, program.program]);

  return (
    <Card 
      className={cn(
        'overflow-hidden cursor-pointer group relative',
        'hover:shadow-xl hover:-translate-y-1 transition-all duration-300',
        'border border-border/50 hover:border-primary/30',
        'active:scale-[0.98]' // Touch feedback
      )}
      onClick={handleClick}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-3 sm:p-4 lg:p-5 relative">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors duration-300 flex-shrink-0">
              <ProgramLogo program={program.program} size="md" className="sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground text-sm sm:text-base lg:text-lg block truncate">
                {program.program}
              </span>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] mt-0.5 h-4 sm:h-5">
                {program.operationsCount} ops
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
        </div>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="p-2 sm:p-3 rounded-lg bg-muted/30">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
              {formatNumber(program.balance)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">milhas disponíveis</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-muted/20">
              <span className="text-[9px] sm:text-xs text-muted-foreground block mb-0.5">Valor estimado</span>
              <span className="font-semibold text-foreground text-xs sm:text-sm truncate block">
                {formatCurrency(estimatedValue)}
              </span>
            </div>
            
            <div className={cn(
              'p-1.5 sm:p-2 rounded-lg',
              costTrend === 'good' && 'bg-success/10',
              costTrend === 'bad' && 'bg-destructive/10',
              costTrend === 'neutral' && 'bg-muted/20'
            )}>
              <span className="text-[9px] sm:text-xs text-muted-foreground block mb-0.5 flex items-center gap-1">
                Custo médio
                {costTrend === 'good' && <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-success" />}
                {costTrend === 'bad' && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />}
              </span>
              <span className={cn(
                'font-semibold text-xs sm:text-sm truncate block',
                costTrend === 'good' && 'text-success dark:text-success',
                costTrend === 'bad' && 'text-destructive',
                costTrend === 'neutral' && 'text-foreground'
              )}>
                {formatCurrency(program.averageCost)}/mil
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoized to prevent re-renders when parent updates but props haven't changed
export const ProgramCardMemo = memo(ProgramCardBase, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.program.program === nextProps.program.program &&
    prevProps.program.balance === nextProps.program.balance &&
    prevProps.program.averageCost === nextProps.program.averageCost &&
    prevProps.program.operationsCount === nextProps.program.operationsCount &&
    prevProps.marketPrice === nextProps.marketPrice
  );
});
