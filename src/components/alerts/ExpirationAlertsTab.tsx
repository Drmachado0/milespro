import { AlertTriangle, Calendar, Clock, Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useExpirationAlerts, ExpiringProgram } from '@/hooks/useExpirationAlerts';
import { useLocalization } from '@/hooks/useLocalization';

const urgencyConfig = {
  critical: {
    badge: 'destructive' as const,
    bgClass: 'bg-destructive/10 border-destructive/30',
    textClass: 'text-destructive',
    label: 'Crítico',
    icon: AlertTriangle,
  },
  warning: {
    badge: 'outline' as const,
    bgClass: 'bg-warning/10 border-warning/30',
    textClass: 'text-warning',
    label: 'Atenção',
    icon: Clock,
  },
  info: {
    badge: 'secondary' as const,
    bgClass: 'bg-muted border-border',
    textClass: 'text-muted-foreground',
    label: 'Info',
    icon: Calendar,
  },
};

function ExpirationCard({ program, urgency }: { program: ExpiringProgram; urgency: 'critical' | 'warning' | 'info' }) {
  const config = urgencyConfig[urgency];
  const Icon = config.icon;
  const { formatNumber, formatDate } = useLocalization();

  return (
    <Card className={`${config.bgClass} transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <ProgramLogo program={program.program} size="lg" />
            {urgency === 'critical' && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{program.program}</h4>
              <Badge variant={config.badge} className="text-xs">
                <Icon className="mr-1 h-3 w-3" />
                {program.daysUntilExpiry} dias
              </Badge>
            </div>

            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${config.textClass} font-mono tabular-nums`}>
                {formatNumber(program.expiringMiles)}
              </span>
              <span className="text-sm text-muted-foreground">milhas</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Vence em {formatDate(program.expiryDate)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpirationAlertsTab() {
  const { expiringPrograms, totalExpiringMiles, criticalExpirations, isLoading, getUrgencyLevel } = useExpirationAlerts();
  const { formatNumber } = useLocalization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (expiringPrograms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Plane className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">Nenhuma milha expirando</h3>
          <p className="text-center text-sm text-muted-foreground">
            Suas milhas estão seguras! Não há vencimentos nos próximos 90 dias.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expirando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold tabular-nums tracking-tight">{formatNumber(totalExpiringMiles)}</div>
            <p className="text-xs text-muted-foreground">nos próximos 90 dias</p>
          </CardContent>
        </Card>
        
        <Card className={criticalExpirations.length > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Críticos (≤7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${criticalExpirations.length > 0 ? 'text-destructive' : ''}`}>
              {criticalExpirations.length}
            </div>
            <p className="text-xs text-muted-foreground">programas com urgência</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Programas Afetados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringPrograms.length}</div>
            <p className="text-xs text-muted-foreground">com milhas expirando</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Critical Section */}
      {criticalExpirations.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Ação Urgente Necessária
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criticalExpirations.map(program => (
              <ExpirationCard 
                key={`${program.program}-${program.expiryDate}`} 
                program={program} 
                urgency="critical" 
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Warning Section */}
      {expiringPrograms.filter(p => getUrgencyLevel(p.daysUntilExpiry) === 'warning').length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-warning">
            <Clock className="h-4 w-4" />
            Atenção (8-30 dias)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiringPrograms
              .filter(p => getUrgencyLevel(p.daysUntilExpiry) === 'warning')
              .map(program => (
                <ExpirationCard 
                  key={`${program.program}-${program.expiryDate}`} 
                  program={program} 
                  urgency="warning" 
                />
              ))}
          </div>
        </div>
      )}
      
      {/* Info Section */}
      {expiringPrograms.filter(p => getUrgencyLevel(p.daysUntilExpiry) === 'info').length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Próximos (31-90 dias)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiringPrograms
              .filter(p => getUrgencyLevel(p.daysUntilExpiry) === 'info')
              .map(program => (
                <ExpirationCard 
                  key={`${program.program}-${program.expiryDate}`} 
                  program={program} 
                  urgency="info" 
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
