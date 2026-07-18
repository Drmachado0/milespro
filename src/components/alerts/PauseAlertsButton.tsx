import { PauseCircle, PlayCircle, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAlertSettings } from '@/hooks/useAlertSettings';

export function PauseAlertsButton() {
  const { 
    settings, 
    toggleAlerts, 
    pauseFor1Hour, 
    pausedUntil,
    isTemporarilyPaused 
  } = useAlertSettings();

  const isPaused = isTemporarilyPaused();
  const isDisabled = !settings.alerts_enabled;

  if (isDisabled) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={toggleAlerts}
        className="gap-2"
      >
        <Power className="h-4 w-4" />
        Ativar Alertas
      </Button>
    );
  }

  if (isPaused) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => {
          localStorage.removeItem('alertsPausedUntil');
          window.location.reload();
        }}
        className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
      >
        <PlayCircle className="h-4 w-4" />
        Retomar ({pausedUntil?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PauseCircle className="h-4 w-4" />
          Pausar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={pauseFor1Hour}>
          <PauseCircle className="h-4 w-4 mr-2" />
          Pausar por 1 hora
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleAlerts} className="text-destructive">
          <PowerOff className="h-4 w-4 mr-2" />
          Desativar alertas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
