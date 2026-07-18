import { Circle, Pause, Moon, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAlertSettings } from '@/hooks/useAlertSettings';

export function AlertStatusBadge() {
  const { getStatus, pausedUntil } = useAlertSettings();
  const status = getStatus();

  const statusConfig = {
    active: {
      label: 'Ativo',
      icon: Circle,
      className: 'bg-success/10 text-success border-success/30',
      iconClassName: 'fill-success text-success',
      tooltip: 'Alertas estão ativos e você receberá notificações.',
    },
    paused: {
      label: 'Pausado',
      icon: Pause,
      className: 'bg-warning/10 text-warning border-warning/30',
      iconClassName: 'text-warning',
      tooltip: pausedUntil 
        ? `Pausado até ${pausedUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : 'Alertas estão temporariamente pausados.',
    },
    quiet: {
      label: 'Silencioso',
      icon: Moon,
      className: 'bg-info/10 text-info border-info/30',
      iconClassName: 'text-info',
      tooltip: 'Modo silencioso ativo. Notificações serão enviadas após o horário configurado.',
    },
    disabled: {
      label: 'Desativado',
      icon: Power,
      className: 'bg-muted text-muted-foreground border-border',
      iconClassName: 'text-muted-foreground',
      tooltip: 'Alertas estão desativados. Ative para receber notificações.',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`gap-1.5 px-2 py-1 cursor-default ${config.className}`}
        >
          <Icon className={`h-3 w-3 ${config.iconClassName}`} />
          <span className="text-xs font-medium">{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
