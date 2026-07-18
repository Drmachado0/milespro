import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Infinity as InfinityIcon, AlertTriangle, Calendar, CreditCard, User, Users } from 'lucide-react';
import type { VIPCounter } from '@/hooks/useVIPCounters';
import { cn } from '@/lib/utils';
import { ProgramLogo } from '@/components/ui/program-logo';

interface VIPCardQuotaProgressProps {
  counter: VIPCounter;
  compact?: boolean;
}

export function VIPCardQuotaProgress({ counter, compact = false }: VIPCardQuotaProgressProps) {
  const getProgressStyles = (status: 'safe' | 'warning' | 'critical' | 'unlimited') => {
    switch (status) {
      case 'critical':
        return 'bg-destructive/20 [&>div]:bg-destructive';
      case 'warning':
        return 'bg-warning/20 [&>div]:bg-warning';
      case 'unlimited':
        return 'bg-primary/20 [&>div]:bg-primary';
      default:
        return 'bg-success/20 [&>div]:bg-success';
    }
  };

  const getStatusBadge = () => {
    switch (counter.overallStatus) {
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Crítico
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="text-xs gap-1 bg-warning/20 text-warning dark:text-warning border-warning/30">
            Atenção
          </Badge>
        );
      case 'unlimited':
        return (
          <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
            <InfinityIcon className="h-3 w-3" />
            Ilimitada
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate percentages for progress bars
  const titularPercentage = counter.isTitularUnlimited ? 0 : 
    counter.titularQuota && counter.titularQuota > 0 
      ? (counter.titularUsed / counter.titularQuota) * 100 
      : 0;

  const convidadoPercentage = counter.isConvidadoUnlimited ? 0 : 
    counter.convidadoQuota && counter.convidadoQuota > 0 
      ? (counter.convidadoUsed / counter.convidadoQuota) * 100 
      : 0;

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          {counter.isTitularUnlimited ? (
            <span className="text-xs text-primary font-medium flex items-center gap-1">
              <InfinityIcon className="h-3 w-3" />
              Ilim.
            </span>
          ) : (
            <>
              <Progress value={titularPercentage} className={cn('h-1.5 flex-1', getProgressStyles(counter.titularStatus))} />
              <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                {counter.titularRemaining}/{counter.titularQuota}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3 text-muted-foreground" />
          {counter.isConvidadoUnlimited ? (
            <span className="text-xs text-primary font-medium flex items-center gap-1">
              <InfinityIcon className="h-3 w-3" />
              Ilim.
            </span>
          ) : (
            <>
              <Progress value={convidadoPercentage} className={cn('h-1.5 flex-1', getProgressStyles(counter.convidadoStatus))} />
              <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                {counter.convidadoRemaining}/{counter.convidadoQuota}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 rounded-2xl border border-border/50 bg-card hover:bg-accent/50 transition-colors cursor-default">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {counter.linkedProgram ? (
                  <ProgramLogo program={counter.linkedProgram} className="h-8 w-8" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm line-clamp-1">{counter.cardName}</p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    **** {counter.lastFourDigits || '0000'}
                  </p>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {counter.holderName && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                Titular: {counter.holderName}
              </p>
            )}

            {/* Cota Titular */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Cota Titular
                </span>
                {counter.isTitularUnlimited ? (
                  <span className="font-medium text-primary flex items-center gap-1">
                    <InfinityIcon className="h-3 w-3" />
                    Ilimitada
                  </span>
                ) : (
                  <span className="font-medium font-mono tabular-nums">{counter.titularUsed}/{counter.titularQuota}</span>
                )}
              </div>
              {!counter.isTitularUnlimited && (
                <Progress 
                  value={titularPercentage} 
                  className={cn("h-2", getProgressStyles(counter.titularStatus))}
                />
              )}
              {!counter.isTitularUnlimited && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Usados: <span className="font-mono tabular-nums">{counter.titularUsed}</span></span>
                  <span className={cn(
                    "text-xs font-bold font-mono tabular-nums",
                    counter.titularStatus === 'critical' && "text-destructive",
                    counter.titularStatus === 'warning' && "text-warning",
                    counter.titularStatus === 'safe' && "text-success"
                  )}>
                    Restantes: {counter.titularRemaining}
                  </span>
                </div>
              )}
            </div>

            {/* Cota Convidado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Cota Convidado
                </span>
                {counter.isConvidadoUnlimited ? (
                  <span className="font-medium text-primary flex items-center gap-1">
                    <InfinityIcon className="h-3 w-3" />
                    Ilimitada
                  </span>
                ) : (
                  <span className="font-medium font-mono tabular-nums">{counter.convidadoUsed}/{counter.convidadoQuota}</span>
                )}
              </div>
              {!counter.isConvidadoUnlimited && (
                <Progress 
                  value={convidadoPercentage} 
                  className={cn("h-2", getProgressStyles(counter.convidadoStatus))}
                />
              )}
              {!counter.isConvidadoUnlimited && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Usados: <span className="font-mono tabular-nums">{counter.convidadoUsed}</span></span>
                  <span className={cn(
                    "text-xs font-bold font-mono tabular-nums",
                    counter.convidadoStatus === 'critical' && "text-destructive",
                    counter.convidadoStatus === 'warning' && "text-warning",
                    counter.convidadoStatus === 'safe' && "text-success"
                  )}>
                    Restantes: {counter.convidadoRemaining}
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="p-3">
          <p className="font-medium mb-2">Histórico (últimos 3 meses)</p>
          <div className="space-y-1">
            {counter.lastThreeMonths.map((month) => (
              <div key={month.month} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{month.month}</span>
                <span className="font-medium font-mono tabular-nums">T: {month.titular} | C: {month.convidado}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Renova em 01/Jan
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
