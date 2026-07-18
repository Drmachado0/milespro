import { AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';

interface ProgramAlertsProps {
  averageCost: number;
  marketPrice: number;
  expiringMiles: number;
  expiryDate: string | null;
  roi: number;
}

interface Alert {
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: React.ElementType;
  title: string;
  message: string;
}

export function ProgramAlerts({
  averageCost,
  marketPrice,
  expiringMiles,
  expiryDate,
  roi,
}: ProgramAlertsProps) {
  const { formatNumber } = useLocalization();
  const alerts: Alert[] = [];

  // Cost vs Market analysis
  const costRatio = averageCost / marketPrice;
  
  if (costRatio <= 0.7) {
    alerts.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Excelente Custo!',
      message: `Seu custo médio está ${formatNumber((1 - costRatio) * 100, 0)}% abaixo do mercado. Ótimo momento para vender ou aproveitar promoções.`,
    });
  } else if (costRatio <= 0.9) {
    alerts.push({
      type: 'info',
      icon: TrendingUp,
      title: 'Bom Custo',
      message: `Seu custo médio está ${formatNumber((1 - costRatio) * 100, 0)}% abaixo do mercado. Continue aproveitando boas oportunidades.`,
    });
  } else if (costRatio > 1) {
    alerts.push({
      type: 'danger',
      icon: AlertTriangle,
      title: 'Custo Acima do Mercado',
      message: `Seu custo médio está ${formatNumber((costRatio - 1) * 100, 0)}% acima do preço de mercado. Considere esperar promoções melhores.`,
    });
  }

  // ROI analysis
  if (roi > 20) {
    alerts.push({
      type: 'success',
      icon: TrendingUp,
      title: 'ROI Positivo',
      message: `Com ${formatNumber(roi, 1)}% de ROI, você tem uma boa margem para venda ou uso das milhas.`,
    });
  } else if (roi < -10) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'ROI Negativo',
      message: `ROI de ${formatNumber(roi, 1)}% sugere prejuízo se vender agora. Considere usar as milhas para emissões.`,
    });
  }

  // Expiring miles alert
  if (expiringMiles > 0 && expiryDate) {
    alerts.push({
      type: 'warning',
      icon: Clock,
      title: 'Milhas Vencendo',
      message: `${formatNumber(expiringMiles, 0)} milhas vencem em ${expiryDate}. Use ou transfira antes do vencimento.`,
    });
  }

  if (alerts.length === 0) return null;

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/30 text-success';
      case 'warning':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'danger':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'info':
        return 'bg-info/10 border-info/30 text-info';
    }
  };

  const getIconStyles = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-destructive';
      case 'info':
        return 'text-info';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border',
            getAlertStyles(alert.type)
          )}
        >
          <alert.icon className={cn('h-5 w-5 mt-0.5 shrink-0', getIconStyles(alert.type))} />
          <div>
            <p className="font-medium">{alert.title}</p>
            <p className="text-sm opacity-90">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
