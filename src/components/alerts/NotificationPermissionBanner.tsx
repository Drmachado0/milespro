import { Bell, BellOff, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationPermissionBanner() {
  const { permission, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already granted, dismissed, or unsupported
  if (permission === 'granted' || permission === 'unsupported' || dismissed) {
    return null;
  }

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  return (
    <div className="relative mb-4 rounded-lg border border-warning/20 bg-warning/10 p-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/50 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20">
          {permission === 'denied' ? (
            <BellOff className="h-5 w-5 text-warning" />
          ) : (
            <Bell className="h-5 w-5 text-warning" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-foreground">
            {permission === 'denied' 
              ? 'Notificações Bloqueadas' 
              : 'Ativar Notificações Push'}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {permission === 'denied' 
              ? 'As notificações estão bloqueadas no seu navegador. Para ativá-las, acesse as configurações do navegador.' 
              : 'Receba alertas instantâneos sobre promoções de milhas, alertas de preço e vencimentos diretamente no seu navegador.'}
          </p>
          
          {permission !== 'denied' && (
            <Button
              onClick={handleRequestPermission}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <Bell className="mr-2 h-4 w-4" />
              Ativar Notificações
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
