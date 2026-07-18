import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Clock, AlertTriangle, Bell, BellOff, Timer } from 'lucide-react';
import { useExpirationAlerts } from '@/hooks/useExpirationAlerts';
import { useNotifications } from '@/hooks/useNotifications';
import { useLocalization } from '@/hooks/useLocalization';
import { cn } from '@/lib/utils';

const urgencyConfig = {
  critical: {
    badge: 'bg-destructive text-destructive-foreground',
    border: 'border border-destructive/30',
    bg: 'bg-gradient-to-r from-destructive/10 to-transparent',
    icon: 'text-destructive',
    pulse: true,
  },
  warning: {
    badge: 'bg-warning text-white',
    border: 'border border-warning/30',
    bg: 'bg-gradient-to-r from-warning/10 to-transparent',
    icon: 'text-warning',
    pulse: false,
  },
  info: {
    badge: 'bg-info text-white',
    border: 'border border-info/30',
    bg: 'bg-gradient-to-r from-info/10 to-transparent',
    icon: 'text-info',
    pulse: false,
  },
};

export function ExpirationAlertsCard() {
  const { expiringPrograms, totalExpiringMiles, isLoading, getUrgencyLevel } = useExpirationAlerts();
  const { isEnabled, requestPermission } = useNotifications();
  const { formatNumber } = useLocalization();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Timer className="h-4 w-4 text-warning" />
            </div>
            Milhas Vencendo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-xl"></div>
            <div className="h-16 bg-muted rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expiringPrograms.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-success/10">
              <Timer className="h-4 w-4 text-success" />
            </div>
            Milhas Vencendo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 bg-muted/20 rounded-xl border border-dashed">
            <div className="p-3 rounded-full bg-success/10 mb-3">
              <Clock className="h-8 w-8 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhuma milha vencendo nos próximos 90 dias
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Timer className="h-4 w-4 text-warning" />
            </div>
            Milhas Vencendo
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={requestPermission}
            className={cn(
              'h-8 px-2 rounded-lg',
              isEnabled ? 'hover:bg-primary/10' : 'hover:bg-muted'
            )}
            title={isEnabled ? 'Notificações ativadas' : 'Ativar notificações'}
          >
            {isEnabled ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-warning dark:text-warning">
            {formatNumber(totalExpiringMiles)} milhas em risco
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {expiringPrograms.slice(0, 5).map((program, index) => {
          const urgency = getUrgencyLevel(program.daysUntilExpiry);
          const config = urgencyConfig[urgency];
          
          return (
            <div
              key={program.program}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl',
                'transition-all duration-200 hover:shadow-sm',
                config.border,
                config.bg,
                'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-background shadow-sm">
                  <ProgramLogo program={program.program} size="sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{program.program}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(program.expiringMiles)} milhas
                  </p>
                </div>
              </div>
              <Badge className={cn(
                'text-xs font-semibold',
                config.badge,
                config.pulse && 'animate-pulse'
              )}>
                {program.daysUntilExpiry === 0 
                  ? 'Hoje!'
                  : program.daysUntilExpiry === 1 
                    ? 'Amanhã' 
                    : `${program.daysUntilExpiry} dias`}
              </Badge>
            </div>
          );
        })}
        
        {expiringPrograms.length > 5 && (
          <div className="text-center pt-2">
            <Badge variant="secondary" className="text-xs">
              +{expiringPrograms.length - 5} programas com milhas vencendo
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
