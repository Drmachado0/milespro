import { createContext } from 'react';

export interface ManagedAccountRow {
  id: string;
  owner_user_id: string;
  managed_user_id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
}

export interface ManagedAccountContextValue {
  activeUserId: string | null;
  isOwnAccount: boolean;
  managedAccounts: ManagedAccountRow[];
  switchTo: (userId: string) => void;
  isLoading: boolean;
}

export const ManagedAccountContext = createContext<ManagedAccountContextValue | undefined>(undefined);
