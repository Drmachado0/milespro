import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from "@/lib/logger";
import { 
  syncPendingOperations, 
  getPendingCount, 
  hasPendingOperations,
  queueOperation,
  PendingOperation
} from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { useLocalization } from './useLocalization';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

export function useOfflineSync() {
  const { t } = useLocalization();
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: getPendingCount(),
    lastSyncAt: null,
  });
  
  const syncInProgressRef = useRef(false);
  
  // Sync pending operations
  const sync = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) {
      return;
    }
    
    if (!hasPendingOperations()) {
      return;
    }
    
    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const result = await syncPendingOperations();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.remaining,
        lastSyncAt: new Date(),
      }));
      
      if (result.synced > 0) {
        toast.success(
          result.synced === 1 
            ? 'Operação sincronizada com sucesso' 
            : `${result.synced} operações sincronizadas`
        );
      }
      
      if (result.failed > 0) {
        toast.error(`${result.failed} operações falharam ao sincronizar`);
      }
    } catch (error) {
      logger.error('[OfflineSync] Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    } finally {
      syncInProgressRef.current = false;
    }
  }, []);
  
  // Queue an operation for later sync
  const queue = useCallback((
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ) => {
    const id = queueOperation(table, action, data);
    setState(prev => ({ ...prev, pendingCount: getPendingCount() }));
    
    if (!navigator.onLine) {
      toast.info('Operação salva localmente. Será sincronizada quando a conexão retornar.');
    }
    
    return id;
  }, []);
  
  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      logger.log('[OfflineSync] Connection restored');
      setState(prev => ({ ...prev, isOnline: true }));
      
      if (hasPendingOperations()) {
        toast.info('Conexão restaurada. Sincronizando operações pendentes...');
        // Small delay to ensure connection is stable
        setTimeout(sync, 1000);
      }
    };
    
    const handleOffline = () => {
      logger.log('[OfflineSync] Connection lost');
      setState(prev => ({ ...prev, isOnline: false }));
      toast.warning('Você está offline. Operações serão salvas localmente.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check for pending operations on mount
    if (navigator.onLine && hasPendingOperations()) {
      sync();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);
  
  // Periodic sync check (every 30 seconds when online)
  useEffect(() => {
    if (!state.isOnline) return;
    
    const interval = setInterval(() => {
      if (hasPendingOperations() && !syncInProgressRef.current) {
        sync();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.isOnline, sync]);
  
  return {
    ...state,
    sync,
    queue,
    hasPending: state.pendingCount > 0,
  };
}
