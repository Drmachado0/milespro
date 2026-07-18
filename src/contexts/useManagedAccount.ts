import { useContext } from 'react';
import { ManagedAccountContext } from './managedAccountContextBase';
import type { ManagedAccountContextValue } from './managedAccountContextBase';

export function useManagedAccount(): ManagedAccountContextValue {
  const ctx = useContext(ManagedAccountContext);
  if (!ctx) {
    // Provider is mounted in App.tsx; throwing here surfaces ordering bugs
    // immediately during development.
    throw new Error('useManagedAccount must be used within a ManagedAccountProvider');
  }
  return ctx;
}
