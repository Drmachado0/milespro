import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLocalization } from '@/hooks/useLocalization';
import { CurrentMonthAlert } from '@/hooks/useIncomeTaxReport';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExemptionLimitAlertProps {
  alert: CurrentMonthAlert;
  exemptionLimit: number;
}

export function ExemptionLimitAlert({ alert, exemptionLimit }: ExemptionLimitAlertProps) {
  const { formatCurrency, t } = useLocalization();
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });

  const getAlertStyles = () => {
    switch (alert.level) {
      case 'danger':
        return {
          bg: 'bg-destructive/10 border-destructive/30',
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          progressColor: 'bg-destructive',
          textColor: 'text-destructive',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10 border-warning/30',
          icon: <AlertTriangle className="h-5 w-5 text-warning" />,
          progressColor: 'bg-warning',
          textColor: 'text-warning',
        };
      default:
        return {
          bg: 'bg-success/10 border-success/30',
          icon: <CheckCircle className="h-5 w-5 text-success" />,
          progressColor: 'bg-success',
          textColor: 'text-success',
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <Card className={`border ${styles.bg}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {styles.icon}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium capitalize">
                {t('incomeTax.currentMonth')}: {currentMonth}
              </p>
              <span className={`text-sm font-semibold font-mono tabular-nums ${styles.textColor}`}>
                {alert.percentOfLimit.toFixed(1)}% {t('incomeTax.ofLimit')}
              </span>
            </div>
            
            <Progress 
              value={Math.min(alert.percentOfLimit, 100)} 
              className="h-2"
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('incomeTax.currentSales')}: <span className="font-medium text-foreground font-mono tabular-nums">{formatCurrency(alert.currentSales)}</span>
              </span>
              <span className="text-muted-foreground">
                {t('incomeTax.remaining')}: <span className={`font-medium font-mono tabular-nums ${alert.remaining > 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(alert.remaining)}
                </span>
              </span>
            </div>

            {alert.level === 'danger' && (
              <p className="text-sm text-destructive">
                {t('incomeTax.limitExceededMessage')}
              </p>
            )}
            {alert.level === 'warning' && (
              <p className="text-sm text-warning">
                {t('incomeTax.nearLimitMessage')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
