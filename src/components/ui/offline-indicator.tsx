import { WifiOff, RefreshCw, Cloud, CloudOff, Wifi } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from './button';
import { Badge } from './badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { hapticWarning, hapticSuccess } from '@/lib/haptics';
import { useEffect, useRef } from 'react';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, sync, hasPending } = useOfflineSync();
  const { isSlowConnection } = useNetworkStatus();
  const wasOffline = useRef(false);
  
  // Haptic feedback when connection status changes
  useEffect(() => {
    if (!isOnline && !wasOffline.current) {
      hapticWarning();
      wasOffline.current = true;
    } else if (isOnline && wasOffline.current) {
      hapticSuccess();
      wasOffline.current = false;
    }
  }, [isOnline]);
  
  // Don't show anything if online and no pending operations
  if (isOnline && !hasPending && !isSyncing && !isSlowConnection) {
    return null;
  }
  
  return (
    <div 
      className="fixed z-50 flex items-center gap-2"
      style={{
        bottom: 'calc(1rem + var(--safe-area-inset-bottom))',
        right: 'calc(1rem + var(--safe-area-inset-right))',
      }}
    >
      {/* Slow Connection Warning */}
      {isOnline && isSlowConnection && !hasPending && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning dark:text-warning shadow-lg border border-warning/20">
          <Wifi className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Conexão lenta</span>
        </div>
      )}
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground shadow-lg animate-pulse">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}
      
      {/* Pending Operations Badge */}
      {hasPending && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync()}
              disabled={!isOnline || isSyncing}
              className={cn(
                "rounded-full shadow-lg gap-2 touch-manipulation",
                isSyncing && "animate-pulse"
              )}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isOnline ? (
                <Cloud className="h-4 w-4" />
              ) : (
                <CloudOff className="h-4 w-4" />
              )}
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {pendingCount}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isSyncing 
              ? 'Sincronizando...' 
              : isOnline 
                ? 'Clique para sincronizar operações pendentes'
                : 'Operações pendentes (aguardando conexão)'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
