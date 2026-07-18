import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

// MUST come before the import of Assinatura
mockIsIOSCapacitor();

// Stub auth + supabase + telemetry to avoid network in tests.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    plan: 'free',
    limits: { maxOperationsPerMonth: 50, currentMonthOperations: 0 },
    isFree: true,
    isPro: false,
    isVip: false,
  }),
}));
vi.mock('@/hooks/useLocalization', () => ({
  useLocalization: () => ({
    formatCurrency: (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`,
    t: (k: string) => k,
  }),
}));
vi.mock('@/hooks/useTelemetry', () => ({
  useTelemetry: () => ({
    trackStartedCheckout: vi.fn(),
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));
// Stub DashboardLayout to passthrough — its Header/Sidebar require many providers
// (TourContext, ManagedAccount, etc.) that are not relevant to the Path C assertion.
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout-stub">{children}</div>,
}));

// Import AFTER mocks
import Assinatura from '@/pages/Assinatura';

function renderAssinatura() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>
          <Assinatura />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('Assinatura Path C runtime hide', () => {
  it('iOS branch — neutral panel WITHOUT pricing strings, WITHOUT clickable checkout link', () => {
    setIsIOSCapacitor(true);
    const { container, queryByText, queryAllByRole } = renderAssinatura();

    // The neutral panel must mention "Gerencie sua assinatura" but NOT pricing.
    expect(queryByText(/Gerencie sua assinatura/i)).toBeInTheDocument();

    // No R$ currency strings
    expect(container.textContent || '').not.toMatch(/R\$/);
    // No CTA copy
    expect(container.textContent || '').not.toMatch(/Assinar Pro|Assinar VIP|Upgrade/i);

    // CRIT-03 / D-T16: NO clickable link from inside iOS app to checkout/pricing route
    const links = queryAllByRole('link');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      expect(href).not.toMatch(/assinatura|planos|checkout|asaas/i);
    }
  });

  it('non-iOS (web/android) branch — pricing surface SHOWS pricing strings', () => {
    setIsIOSCapacitor(false);
    const { container } = renderAssinatura();

    // Some pricing string is present — R$ from formatCurrency or the plan-card label.
    const text = container.textContent || '';
    expect(text).toMatch(/R\$|Plano Pro|Plano VIP|Assinar/i);
  });
});
