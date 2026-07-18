/**
 * PlanProtectedRoute critical-path test (SEC-07 — Plan 06 Task 2).
 *
 * Verifies the hierarchical gate logic enforced at the route boundary:
 *  - plan='free' + requiredPlans=['free']          -> renders children
 *  - plan='pro'  + requiredPlans=['pro','vip']     -> renders children (Pro can access Pro tier)
 *  - plan='free' + requiredPlans=['pro']           -> redirects (adversarial)
 *  - plan='pro'  + requiredPlans=['vip']           -> redirects (adversarial)
 *  - isLoading=true                                 -> loader visible, no redirect yet
 *
 * Mocks useSubscription (the source of plan/loading/canAccess flags) and the
 * Navigate component from react-router-dom (so we can assert redirects via spy
 * instead of relying on a real router-history side effect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProtectedRoute } from '@/components/PlanProtectedRoute';

const mockSubscription = vi.fn();
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockSubscription(),
}));

const mockNavigateRendered = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    Navigate: (p: { to: string }) => {
      mockNavigateRendered(p.to);
      return null;
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanProtectedRoute', () => {
  it('plan=free, requiredPlans=[free]: renders children', () => {
    mockSubscription.mockReturnValue({
      plan: 'free',
      isLoading: false,
      canAccessPro: false,
      canAccessVip: false,
    });

    render(
      <MemoryRouter>
        <PlanProtectedRoute requiredPlans={['free']}>
          <div data-testid="child" />
        </PlanProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(mockNavigateRendered).not.toHaveBeenCalled();
  });

  it('plan=pro, requiredPlans=[pro,vip]: renders children (hierarchical access)', () => {
    mockSubscription.mockReturnValue({
      plan: 'pro',
      isLoading: false,
      canAccessPro: true,
      canAccessVip: false,
    });

    render(
      <MemoryRouter>
        <PlanProtectedRoute requiredPlans={['pro', 'vip']}>
          <div data-testid="child" />
        </PlanProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(mockNavigateRendered).not.toHaveBeenCalled();
  });

  it('plan=free, requiredPlans=[pro]: redirects (adversarial)', () => {
    mockSubscription.mockReturnValue({
      plan: 'free',
      isLoading: false,
      canAccessPro: false,
      canAccessVip: false,
    });

    render(
      <MemoryRouter>
        <PlanProtectedRoute requiredPlans={['pro']}>
          <div data-testid="child" />
        </PlanProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigateRendered).toHaveBeenCalled();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('plan=pro, requiredPlans=[vip]: redirects (adversarial)', () => {
    mockSubscription.mockReturnValue({
      plan: 'pro',
      isLoading: false,
      canAccessPro: true,
      canAccessVip: false,
    });

    render(
      <MemoryRouter>
        <PlanProtectedRoute requiredPlans={['vip']}>
          <div data-testid="child" />
        </PlanProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigateRendered).toHaveBeenCalled();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('isLoading=true: loader visible, no redirect, no child', () => {
    mockSubscription.mockReturnValue({
      plan: undefined,
      isLoading: true,
      canAccessPro: false,
      canAccessVip: false,
    });

    render(
      <MemoryRouter>
        <PlanProtectedRoute requiredPlans={['pro']}>
          <div data-testid="child" />
        </PlanProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigateRendered).not.toHaveBeenCalled();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });
});
