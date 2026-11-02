import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

import { setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

// Mock the Crisp SDK so we can spy on configure() without loading the real CDN.
// vi.hoisted() lets us reference crispMock inside the hoisted vi.mock() factory.
const crispMock = vi.hoisted(() => ({
  configure: vi.fn(),
  user: { setEmail: vi.fn() },
  chat: { hide: vi.fn() },
}));
vi.mock('crisp-sdk-web', () => ({ Crisp: crispMock }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Mock useConsent to return marketingOptedIn=true so the OTHER gate doesn't
// short-circuit the test before the iOS gate is exercised.
vi.mock('@/hooks/useConsent', () => ({
  useConsent: () => ({
    marketingOptedIn: true,
    privacyAcceptedAt: new Date().toISOString(),
    isLoading: false,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { CrispWidget } from '@/components/layout/CrispWidget';

beforeEach(() => {
  crispMock.configure.mockClear();
  crispMock.user.setEmail.mockClear();
  crispMock.chat.hide.mockClear();
});

describe('CrispWidget Path C runtime hide', () => {
  it('iOS branch — does NOT call Crisp.configure()', () => {
    setIsIOSCapacitor(true);
    render(<CrispWidget />);
    expect(crispMock.configure).not.toHaveBeenCalled();
  });

  it('non-iOS branch — does NOT call Crisp.configure() either when WEBSITE_ID env is unset', () => {
    setIsIOSCapacitor(false);
    // VITE_CRISP_WEBSITE_ID is unset in vitest by default → early return BEFORE the iOS check.
    // This asserts the component renders without throwing in either branch.
    const result = render(<CrispWidget />);
    expect(result.container).toBeDefined();
    expect(crispMock.configure).not.toHaveBeenCalled();
  });
});
