import { createContext } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export type OfflineSyncContextType = ReturnType<typeof useOfflineSync>;

export const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);
