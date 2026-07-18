import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromotionsProvider } from '@/contexts/PromotionsContext';
import { OfflineSyncProvider } from '@/contexts/OfflineSyncContext';
import { TourProvider } from '@/contexts/TourContext';
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { PushPermissionPrompt } from '@/components/push/PushPermissionPrompt';
import { registerPushHandler } from '@/lib/pushHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedProvidersProps {
  children: ReactNode;
}

function CommandPaletteWrapper() {
  const { isOpen, closeCommandPalette, toggleCommandPalette } = useCommandPalette();
  return (
    <CommandPalette
      open={isOpen}
      onOpenChange={(open) => open ? toggleCommandPalette() : closeCommandPalette()}
    />
  );
}

/**
 * Push handler mount — Plan 03-05 / MOBILE-04.
 *
 * Sits inside the auth-gated tree (ProtectedProviders is rendered below
 * AuthProvider in App.tsx) so useAuth().user.id is guaranteed available.
 *
 * registerPushHandler is no-op on web — safe to mount unconditionally;
 * useEffect dep [user?.id] handles login/logout re-registration.
 *
 * PushPermissionPrompt is rendered as a sibling overlay (auto-opens itself
 * via usePushPermission().shouldShowPrompt — no prop drilling needed).
 */
function PushMount() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    const handle = registerPushHandler(supabase, user.id, navigate);
    return () => {
      handle.unsubscribe();
    };
  }, [user?.id, navigate]);

  return <PushPermissionPrompt />;
}

/**
 * Wraps authenticated route providers to avoid loading them on public pages.
 * This reduces initial JS payload and network requests for the landing page.
 */
export function ProtectedProviders({ children }: ProtectedProvidersProps) {
  return (
    <CommandPaletteProvider>
      <PromotionsProvider>
        <OfflineSyncProvider>
          <TourProvider>
            {children}
            <CommandPaletteWrapper />
            <PushMount />
          </TourProvider>
        </OfflineSyncProvider>
      </PromotionsProvider>
    </CommandPaletteProvider>
  );
}
