/**
 * useSubscription critical-path test (SEC-07 — Plan 06 Task 2).
 *
 * Verifies:
 *  - no subscription row     -> plan = 'free', canAccessPro/Vip = false
 *  - plan = 'pro'            -> canAccessPro = true, canAccessVip = false
 *  - plan = 'vip'            -> canAccessPro = true (inherited), canAccessVip = true
 *  - B-2 regression guard    -> legacy 'basic' (non-canonical) coerces to 'free'
 *                               (strict equality — NOT 'basic', NOT 'pro').
 *
 * The B-2 test is the heart of this file: it proves Plan 02 §3.1's VALID_PLANS
 * runtime guard is in place. If the guard is missing, `plan` becomes 'basic'
 * (untyped) and the strict `=== 'free'` assertion fails. If the deleted
 * collapse logic returns, `plan` becomes 'pro' and the same assertion fails.
 * Only the VALID_PLANS guard produces `plan === 'free'`.
 *
 * Real call shape:
 *   supabase.from('user_subscriptions').select('*').eq(...).eq(...).maybeSingle()
 *   supabase.from('operations').select('*', { count, head }).eq(...).gte(...).lte(...)
 *   supabase.from('user_programs').select('*', { count, head }).eq(...).eq(...)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscription } from '@/hooks/useSubscription';

// Per-test override for the user_subscriptions.maybeSingle() return.
const mockUserSubMaybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  // Generic table-aware mock: only user_subscriptions returns plan data;
  // operations/user_programs return count=0 so the hook resolves quickly.
  const buildUserSubBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => mockUserSubMaybeSingle(),
  });

  const buildCountBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'user_subscriptions') return buildUserSubBuilder();
        // operations and user_programs both follow the "count" pattern.
        return buildCountBuilder();
      }),
    },
  };
});

// useAuth is imported by useSubscription via '@/hooks/useAuth' — return a
// stable test user so the hook's `enabled: !!user` queries fire.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-test' } }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSubscription', () => {
  it('no subscription row -> plan = free, canAccessPro/Vip = false', async () => {
    mockUserSubMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useSubscription(), { wrapper });
    await waitFor(() => expect(result.current.plan).toBe('free'));
    expect(result.current.canAccessPro).toBe(false);
    expect(result.current.canAccessVip).toBe(false);
  });

  it('plan = pro -> canAccessPro=true, canAccessVip=false', async () => {
    mockUserSubMaybeSingle.mockResolvedValueOnce({
      data: { plan: 'pro' },
      error: null,
    });
    const { result } = renderHook(() => useSubscription(), { wrapper });
    await waitFor(() => expect(result.current.plan).toBe('pro'));
    expect(result.current.canAccessPro).toBe(true);
    expect(result.current.canAccessVip).toBe(false);
  });

  it('plan = vip -> canAccessPro=true (inherited), canAccessVip=true', async () => {
    mockUserSubMaybeSingle.mockResolvedValueOnce({
      data: { plan: 'vip' },
      error: null,
    });
    const { result } = renderHook(() => useSubscription(), { wrapper });
    await waitFor(() => expect(result.current.plan).toBe('vip'));
    expect(result.current.canAccessPro).toBe(true);
    expect(result.current.canAccessVip).toBe(true);
  });

  it(
    'B-2 regression guard: legacy "basic" coerces to "free" (NOT "basic", NOT "pro")',
    async () => {
      // This test PROVES the deleted Plan-02 collapse logic stays deleted AND
      // that the VALID_PLANS runtime validation guard (Plan 02 Task 3 §3.1,
      // B-2 Option A) coerces any non-canonical value to 'free'.
      //
      //   If VALID_PLANS guard is missing -> plan becomes 'basic' (untyped) -> FAIL
      //   If collapse logic returns       -> plan becomes 'pro'             -> FAIL
      //   Only VALID_PLANS guard          -> plan === 'free'                -> PASS
      mockUserSubMaybeSingle.mockResolvedValueOnce({
        data: { plan: 'basic' as unknown as 'pro' },
        error: null,
      });
      const { result } = renderHook(() => useSubscription(), { wrapper });
      await waitFor(() => expect(result.current.plan).toBeDefined());
      expect(result.current.plan).toBe('free'); // STRICT
      expect(result.current.canAccessPro).toBe(false);
      expect(result.current.canAccessVip).toBe(false);
    },
  );
});
