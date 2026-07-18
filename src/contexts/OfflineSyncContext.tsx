import { ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineSyncContext } from '@/contexts/offlineSync';

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();
  
  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}
