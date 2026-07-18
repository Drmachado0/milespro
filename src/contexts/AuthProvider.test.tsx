/**
 * AuthProvider critical-path test (SEC-07 — Plan 06 Task 2).
 *
 * Covers:
 *  - Happy path: mount with no session => user is null, no profile upsert
 *  - Happy path: signUp invokes supabase.auth.signUp + auditAuth.signup
 *  - Adversarial: signIn failure => user null, auditAuth.loginFailed called
 *  - Happy path: signOut clears queryClient + audit logs logout
 *
 * Mocks every external dependency the provider reaches into so this stays a
 * pure unit test. No supabase network calls.
 *
 * Notes on the real API (src/contexts/AuthProvider.tsx + src/contexts/authContext.ts):
 *   signUp(email, password, fullName)   -- positional, NOT object
 *   signIn(email, password)             -- positional
 *   signOut()                           -- returns Promise<void>, no error field
 *   useAuth comes from '@/hooks/useAuth' (NOT @/contexts/AuthProvider)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

const mockGetSession = vi.fn(() =>
  Promise.resolve({ data: { session: null }, error: null }),
);

// Capture the callback registered by onAuthStateChange so tests can fire
// arbitrary events (e.g., SIGNED_OUT for the push cleanup wire — Plan 03-05).
type AuthCb = (event: string, session: unknown) => void | Promise<void>;
let capturedAuthCallback: AuthCb | null = null;
const mockOnAuthStateChange = vi.fn((cb: AuthCb) => {
  capturedAuthCallback = cb;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));
const mockProfileUpsert = vi.fn((_a: unknown) => Promise.resolve({ data: null, error: null }));

// Plan 03-05 Q2 RESOLVED — push cleanup wire mocks
const mockFunctionsInvoke = vi.fn();
const mockPushDeleteEq = vi.fn(() => Promise.resolve({ error: null }));
const mockPushDelete = vi.fn(() => ({ eq: (_col: string, _val: string) => mockPushDeleteEq() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: AuthCb) => mockOnAuthStateChange(cb),
      signUp: (a: unknown) => mockSignUp(a),
      signInWithPassword: (a: unknown) => mockSignInWithPassword(a),
      signOut: () => mockSignOut(),
    },
    functions: {
      invoke: (name: string, opts?: unknown) => mockFunctionsInvoke(name, opts),
    },
    from: vi.fn((table: string) => {
      if (table === 'push_subscriptions') {
        return { delete: () => mockPushDelete() };
      }
      return { upsert: (a: unknown) => mockProfileUpsert(a) };
    }),
  },
}));

const mockAuditSignup = vi.fn();
const mockAuditLoginSuccess = vi.fn();
const mockAuditLoginFailed = vi.fn();
const mockAuditLogout = vi.fn();
vi.mock('@/lib/auditLogger', () => ({
  auditAuth: {
    signup: (email: string) => mockAuditSignup(email),
    loginSuccess: (email: string) => mockAuditLoginSuccess(email),
    loginFailed: (email: string, reason?: string) =>
      mockAuditLoginFailed(email, reason),
    logout: () => mockAuditLogout(),
  },
}));

const mockQueryClientClear = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: () => mockQueryClientClear() },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedAuthCallback = null;
  mockFunctionsInvoke.mockReset().mockResolvedValue({ error: null });
  mockPushDeleteEq.mockReset().mockResolvedValue({ error: null });
});

describe('AuthProvider', () => {
  it('mount with no session: user is null and no profile upsert occurs', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    function Consumer() {
      captured = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(captured?.user).toBeNull();
    expect(captured?.session).toBeNull();
    expect(mockProfileUpsert).not.toHaveBeenCalled();
  });

  it('signUp invokes supabase.auth.signUp + auditAuth.signup', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'x@y.z' }, session: null },
      error: null,
    });

    let captured: ReturnType<typeof useAuth> | undefined;
    function Consumer() {
      captured = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured).toBeDefined());

    await act(async () => {
      await captured!.signUp('x@y.z', 'pass1234', 'X User');
    });

    expect(mockSignUp).toHaveBeenCalled();
    expect(mockAuditSignup).toHaveBeenCalledWith('x@y.z');
    expect(mockProfileUpsert).toHaveBeenCalled();
  });

  it('signIn failure (adversarial): user stays null, auditAuth.loginFailed called', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    let captured: ReturnType<typeof useAuth> | undefined;
    function Consumer() {
      captured = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured).toBeDefined());

    let result: { error: Error | null } | undefined;
    await act(async () => {
      result = await captured!.signIn('x@y.z', 'wrong-password');
    });

    expect(result?.error).toBeDefined();
    expect(captured!.user).toBeNull();
    expect(mockAuditLoginFailed).toHaveBeenCalledWith(
      'x@y.z',
      'Invalid login credentials',
    );
    expect(mockAuditLoginSuccess).not.toHaveBeenCalled();
  });

  // Plan 03-05 Task 7 — Q2 RESOLVED. SIGNED_OUT branch wires cleanup-push-subscriptions.
  it('SIGNED_OUT event invokes cleanup-push-subscriptions with mode=signed_out for the prior user', async () => {
    // Mount with a session so previousUserIdRef caches a user id.
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u-prev' } } },
      error: null,
    } as never);

    render(
      <AuthProvider>
        <span />
      </AuthProvider>,
    );

    // Wait for the initial getSession + onAuthStateChange registration.
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    await waitFor(() => expect(capturedAuthCallback).not.toBeNull());

    // Fire SIGNED_OUT manually.
    await act(async () => {
      await capturedAuthCallback!('SIGNED_OUT', null);
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('cleanup-push-subscriptions', {
      body: { user_id: 'u-prev', mode: 'signed_out' },
    });
    // Direct REST DELETE NOT called when edge fn succeeds.
    expect(mockPushDelete).not.toHaveBeenCalled();
  });

  it('SIGNED_OUT falls back to direct REST DELETE on 401 unauthorized from edge fn', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u-401' } } },
      error: null,
    } as never);
    mockFunctionsInvoke.mockResolvedValueOnce({ error: { message: '401 Unauthorized' } });

    render(
      <AuthProvider>
        <span />
      </AuthProvider>,
    );
    await waitFor(() => expect(capturedAuthCallback).not.toBeNull());

    await act(async () => {
      await capturedAuthCallback!('SIGNED_OUT', null);
    });

    expect(mockFunctionsInvoke).toHaveBeenCalled();
    expect(mockPushDelete).toHaveBeenCalled();
    expect(mockPushDeleteEq).toHaveBeenCalled();
  });

  it('SIGNED_OUT cleanup never throws even when both paths fail', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u-fail' } } },
      error: null,
    } as never);
    mockFunctionsInvoke.mockRejectedValueOnce(new Error('network down'));
    mockPushDeleteEq.mockResolvedValueOnce({ error: { message: 'db down', code: '500' } } as never);

    render(
      <AuthProvider>
        <span />
      </AuthProvider>,
    );
    await waitFor(() => expect(capturedAuthCallback).not.toBeNull());

    // Must not throw — logout must never be blocked.
    await act(async () => {
      await expect(capturedAuthCallback!('SIGNED_OUT', null)).resolves.toBeUndefined();
    });
  });

  it('signOut clears queryClient and audits logout', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    function Consumer() {
      captured = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured).toBeDefined());

    await act(async () => {
      await captured!.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(mockAuditLogout).toHaveBeenCalled();
  });
});
