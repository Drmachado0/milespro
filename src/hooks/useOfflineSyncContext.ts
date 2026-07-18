import { useContext } from 'react';
import { OfflineSyncContext } from '@/contexts/offlineSync';

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSyncContext must be used within OfflineSyncProvider');
  }
  return context;
}
