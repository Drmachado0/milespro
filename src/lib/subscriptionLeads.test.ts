import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
  },
}));

describe('subscriptionLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns disabled when env var not set', async () => {
    const { createSubscriptionLead } = await import('./subscriptionLeads');
    const result = await createSubscriptionLead({
      plan: 'free',
      billingPeriod: 'monthly',
      source: 'landing_pricing',
    });
    expect(result.saved).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('saveSubscriptionIntentLocally stores in localStorage', async () => {
    const { saveSubscriptionIntentLocally } = await import('./subscriptionLeads');
    saveSubscriptionIntentLocally({
      plan: 'pro',
      billingPeriod: 'annual',
      source: 'dashboard_subscription',
    });
    const stored = JSON.parse(localStorage.getItem('milespro:last-subscription-intent') || '{}');
    expect(stored.plan).toBe('pro');
    expect(stored.billingPeriod).toBe('annual');
  });
});
