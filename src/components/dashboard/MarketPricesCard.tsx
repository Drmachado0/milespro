import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { RefreshCw, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useLocalization } from '@/hooks/useLocalization';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const FEATURED_PROGRAMS = ['Livelo', 'Smiles', 'TudoAzul', 'Latam', 'Esfera', 'TAP'];

export function MarketPricesCard() {
  const { prices, isLoading, refreshPrices, isRefreshing } = useMarketPrices();
  const { formatCurrency } = useLocalization();
  const navigate = useNavigate();

  const featuredPrices = prices?.filter(p => FEATURED_PROGRAMS.includes(p.program)) || [];

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-success/10">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            Cotações de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const lastUpdate = prices?.[0]?.fetched_at 
    ? format(new Date(prices[0].fetched_at), "dd/MM HH:mm", { locale: ptBR })
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-success/10">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            Cotações de Mercado
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-success/10"
            onClick={() => refreshPrices()}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn(
              'h-4 w-4 text-muted-foreground',
              isRefreshing && 'animate-spin text-success'
            )} />
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Atualizado em {lastUpdate}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {featuredPrices.map((price, index) => (
          <div
            key={price.program}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl',
              'bg-gradient-to-r from-muted/30 to-transparent',
              'border border-border/50 hover:border-primary/30',
              'hover:shadow-sm transition-all duration-200',
              'animate-fade-in'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-background shadow-sm">
                <ProgramLogo program={price.program} size="sm" />
              </div>
              <span className="text-sm font-semibold text-foreground">{price.program}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-sm font-bold text-success dark:text-success">
                    {formatCurrency(price.buy_price)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">compra</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-warning rotate-180" />
                  <span className="text-sm font-bold text-warning dark:text-warning">
                    {formatCurrency(price.sell_price)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">venda</span>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 rounded-xl hover:bg-primary/5 hover:border-primary/30 group"
          onClick={() => navigate('/gestao/precos-programas')}
        >
          Ver todos os programas
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
