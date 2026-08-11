import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

vi.mock('@/lib/posthog', () => ({ track: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/subscriptionLeads', () => ({
  createSubscriptionLead: vi.fn(),
  saveSubscriptionIntentLocally: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

import { PricingSection } from '@/components/landing/AnimatedSections';

const fakePlans = [
  {
    name: 'Pro',
    price: 'R$ 37,90',
    period: '/mês',
    description: 'Para o entusiasta',
    features: ['Feature 1', 'Feature 2'],
    cta: 'Assinar Pro',
    popular: true,
    monthlyPrice: 'R$ 37,90',
    semiannualPrice: 'R$ 199,90',
    semiannualMonthly: 'R$ 33,30',
    annualPrice: 'R$ 359,90',
    annualMonthly: 'R$ 29,90',
  },
];

describe('AnimatedSections.PricingSection Path C runtime hide', () => {
  it('iOS branch — returns null (renders nothing)', () => {
    setIsIOSCapacitor(true);
    const { container } = render(
      <MemoryRouter>
        <PricingSection plans={fakePlans} billingPeriod="monthly" setBillingPeriod={() => {}} />
      </MemoryRouter>,
    );
    // null render → empty body of mount node
    expect(container.firstChild).toBeNull();
  });

  it('non-iOS — renders pricing cards with R$', () => {
    setIsIOSCapacitor(false);
    const { container } = render(
      <MemoryRouter>
        <PricingSection plans={fakePlans} billingPeriod="monthly" setBillingPeriod={() => {}} />
      </MemoryRouter>,
    );
    expect(container.textContent || '').toMatch(/R\$/);
  });
});
