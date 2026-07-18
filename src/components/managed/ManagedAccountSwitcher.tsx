/**
 * ManagedAccountSwitcher — Phase 2 W2b (Plan 02-06) / TIER-06.
 *
 * Dropdown UI that lets a VIP owner switch the active user context between
 * their own account and any non-revoked managed account they own. Non-VIP
 * users see nothing (component returns null).
 *
 * Renders inline next to the user-menu in the dashboard header; embed wherever
 * makes sense for your nav layout. The provider (ManagedAccountProvider) must
 * be mounted higher in the tree (mounted globally in App.tsx).
 */

import { useManagedAccount } from '@/contexts/useManagedAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown } from 'lucide-react';

export function ManagedAccountSwitcher() {
  const { isVip } = useSubscription();
  const { user } = useAuth();
  const { activeUserId, switchTo, managedAccounts, isOwnAccount } = useManagedAccount();

  if (!isVip) return null;
  if (managedAccounts.length === 0) return null;

  const currentLabel = isOwnAccount
    ? 'Minha conta'
    : managedAccounts.find((m) => m.managed_user_id === activeUserId)?.label ?? 'Conta gerenciada';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="max-w-[140px] truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>Trocar perfil</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => user && switchTo(user.id)}
          className={isOwnAccount ? 'font-semibold' : ''}
        >
          Minha conta
        </DropdownMenuItem>
        {managedAccounts.map((m) => {
          const isActive = m.managed_user_id === activeUserId;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => switchTo(m.managed_user_id)}
              className={isActive ? 'font-semibold' : ''}
            >
              {m.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
