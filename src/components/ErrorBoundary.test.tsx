/**
 * ErrorBoundary critical-path test (SEC-07 — Plan 06 Task 2; I-1 deterministic).
 *
 * Covers:
 *  - Happy path: renders child when no throw
 *  - Adversarial: child throws -> fallback rendered + logger.error called
 *  - I-1 (no hedge): "Voltar ao início" button MUST exist; clicking it calls
 *    navigate('/dashboard'). Uses getByRole (strict) — NOT queryByRole — so the
 *    test fails LOUDLY if the home button is missing. No `if (homeBtn) { ... }`
 *    hedge — that was the I-1 anti-pattern the plan calls out.
 *
 * The actual button label in src/components/ErrorBoundary.tsx is
 * "Voltar ao início" (line 62) -- the test regex matches that exactly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppErrorBoundary } from '@/components/ErrorBoundary';

// vi.hoisted() lets us reference these mocks inside vi.mock() factories without
// tripping the "Cannot access before initialization" hoisting error.
const { mockNavigate, mockLogError } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mockLogError,
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/errorSanitizer', () => ({
  sanitizeError: (e: Error) => e.message,
}));

function Boom(): never {
  throw new Error('boom');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AppErrorBoundary', () => {
  it('renders child normally when no throw', () => {
    render(
      <MemoryRouter>
        <AppErrorBoundary>
          <div data-testid="ok" />
        </AppErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });

  it('renders fallback when child throws (adversarial)', () => {
    // react-error-boundary intentionally logs via console.error during throw;
    // suppress so the test output stays clean. We assert on logger.error instead.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <AppErrorBoundary>
          <Boom />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    // logger.error is invoked from BOTH onError (top-level) and the fallback's
    // render path. At least one call is enough to prove the boundary tripped.
    expect(mockLogError).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('I-1: "Voltar ao inicio" button exists (no hedge) and navigates to /dashboard', () => {
    // I-1: removed `if (homeBtn) { ... }` hedge from earlier iterations.
    // The home button MUST exist; if it does not, the test fails -- that is
    // the desired regression-detection behaviour.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <AppErrorBoundary>
          <Boom />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    // The actual button label in src/components/ErrorBoundary.tsx is
    // "Voltar ao início" -- match it (i flag + accent-tolerant regex).
    const homeBtn = screen.getByRole('button', { name: /voltar ao in[ií]cio/i });
    expect(homeBtn).toBeInTheDocument();

    fireEvent.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    spy.mockRestore();
  });
});
