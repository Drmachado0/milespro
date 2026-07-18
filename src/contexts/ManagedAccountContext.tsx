/**
 * ManagedAccountContext — Phase 2 W2b (Plan 02-06) / TIER-06.
 *
 * Lets a VIP owner switch which user_id the rest of the app reads against:
 *   - `activeUserId` defaults to the authenticated user.id (own account).
 *   - VIP users can switch to any managed_user_id they own (see
 *     supabase/migrations/20260512120004_create_managed_accounts_*.sql for
 *     the schema + the can_access_account() RLS function from Phase 1).
 *   - `switchTo(userId)` flips the active context; hooks that consume this
 *     (Dashboard, Operacoes, etc.) should read activeUserId instead of
 *     user.id when fetching data. v1 wires the context + switcher UI only;
 *     downstream consumers migrate in a follow-up plan.
 *
 * Hard isolation rule (D-06 from Phase 1): when a managed_accounts row is
 * revoked (revoked_at != null), can_access_account() returns false. The
 * RLS layer enforces the isolation; this context filters revoked rows from
 * the dropdown so the UI doesn't show a switching target the RLS would
 * immediately reject.
 *
 * Non-VIP behavior: managedAccounts is always [], activeUserId === user.id,
 * switchTo is a no-op. Cheap to mount everywhere.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { ManagedAccountContext } from './managedAccountContextBase';
import type { ManagedAccountContextValue, ManagedAccountRow } from './managedAccountContextBase';

export function ManagedAccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isVip } = useSubscription();
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);

  // Pull the owner's active (non-revoked) managed accounts. Only enabled for
  // VIP users — the SELECT RLS policy on managed_accounts only returns
  // owner_user_id rows anyway, so non-VIP would get [] but we skip the
  // network round-trip for cost.
  const { data: managedAccounts = [], isLoading } = useQuery<ManagedAccountRow[]>({
    queryKey: ['managed_accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            is: (col: string, val: null) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: ManagedAccountRow[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      })
        .from('managed_accounts')
        .select('*')
        .is('revoked_at', null)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!user && isVip,
  });

  const activeUserId = overrideUserId ?? user?.id ?? null;
  const isOwnAccount = activeUserId === user?.id;

  const switchTo = useCallback(
    (userId: string) => {
      // Non-VIP cannot switch; defensive no-op.
      if (!isVip || !user) return;
      // Only allow switching to self or a managed_user_id we own.
      if (userId === user.id) {
        setOverrideUserId(null);
        return;
      }
      const allowed = managedAccounts.some((m) => m.managed_user_id === userId);
      if (allowed) {
        setOverrideUserId(userId);
      }
    },
    [isVip, user, managedAccounts],
  );

  const value = useMemo<ManagedAccountContextValue>(
    () => ({
      activeUserId,
      isOwnAccount,
      managedAccounts,
      switchTo,
      isLoading,
    }),
    [activeUserId, isOwnAccount, managedAccounts, switchTo, isLoading],
  );

  return (
    <ManagedAccountContext.Provider value={value}>
      {children}
    </ManagedAccountContext.Provider>
  );
}
