import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/types/miles';
import { AlertTriangle, Gift, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
interface AlertsPanelProps {
  alerts: Alert[];
}
const alertIcons = {
  warning: AlertTriangle,
  promo: Gift,
  info: Info,
  success: CheckCircle
};
const alertStyles = {
  warning: 'border border-warning/30 bg-warning/10',
  promo: 'border border-violet-500/30 bg-violet-500/10',
  info: 'border border-info/30 bg-info/10',
  success: 'border border-success/30 bg-success/10'
};
const iconStyles = {
  warning: 'text-warning',
  promo: 'text-violet-500',
  info: 'text-info',
  success: 'text-success'
};
export function AlertsPanel({
  alerts
}: AlertsPanelProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Alertas do Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const Icon = alertIcons[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg',
                alertStyles[alert.type]
              )}
            >
              <Icon className={cn('h-5 w-5 mt-0.5', iconStyles[alert.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                {alert.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {alert.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}