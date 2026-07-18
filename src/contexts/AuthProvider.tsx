import { useState, useEffect, ReactNode, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { auditAuth } from '@/lib/auditLogger';
import { queryClient } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import { AuthContext } from '@/contexts/authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Track previous user ID to detect user changes
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // CRITICAL: Execute getSession IMMEDIATELY (no defer) to ensure user is available before queries mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      previousUserIdRef.current = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        const currentUserId = session?.user?.id ?? null;
        const cachedPreviousUserId = previousUserIdRef.current;

        // CRITICAL: Clear cache when user changes (logout/login with different account)
        if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
          logger.log('[Auth]', 'User changed, clearing query cache');
          queryClient.clear();
        }

        previousUserIdRef.current = currentUserId;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Q2 RESOLVED — Push token cleanup on SIGNED_OUT (Plan 03-05 / MOBILE-04).
        // Best-effort: never throws; never blocks logout. Tries edge fn first
        // (Vault-secret or JWT auth), falls back to direct REST DELETE if the
        // edge fn rejects with 401 (RLS auth.uid()=user_id remains valid for
        // the brief pre-sign-out window).
        if (event === 'SIGNED_OUT' && cachedPreviousUserId) {
          let cleanedViaEdgeFn = false;
          try {
            const { error } = await supabase.functions.invoke('cleanup-push-subscriptions', {
              body: { user_id: cachedPreviousUserId, mode: 'signed_out' },
            });
            if (!error) {
              cleanedViaEdgeFn = true;
              logger.log(
                '[AuthProvider]',
                'SIGNED_OUT push cleanup dispatched (edge fn) for user:',
                cachedPreviousUserId,
              );
            } else {
              const msg = (error.message ?? '').toLowerCase();
              if (msg.includes('401') || msg.includes('unauthorized')) {
                // Fall through to direct REST DELETE
              } else {
                logger.error(
                  '[AuthProvider]',
                  'SIGNED_OUT edge fn cleanup error (non-blocking):',
                  error,
                );
              }
            }
          } catch (err) {
            logger.error(
              '[AuthProvider]',
              'SIGNED_OUT edge fn invoke threw (non-blocking):',
              err,
            );
          }

          // Fallback: direct REST DELETE (RLS auth.uid()=user_id allows this
          // while the JWT is still valid in the SIGNED_OUT transition window).
          if (!cleanedViaEdgeFn) {
            try {
              const { error: deleteErr } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', cachedPreviousUserId);
              if (deleteErr) {
                logger.error(
                  '[AuthProvider]',
                  'SIGNED_OUT direct REST cleanup failed (non-blocking):',
                  deleteErr,
                );
              } else {
                logger.log(
                  '[AuthProvider]',
                  'SIGNED_OUT push cleanup dispatched (direct REST) for user:',
                  cachedPreviousUserId,
                );
              }
            } catch (err) {
              logger.error(
                '[AuthProvider]',
                'SIGNED_OUT direct REST cleanup threw (non-blocking):',
                err,
              );
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Log detalhado em desenvolvimento
    logger.log('[Auth]', 'Signup attempt:', { email, success: !error });
    if (error) logger.error('[Auth]', 'Signup error:', error);
    if (data?.user) logger.log('[Auth]', 'User created:', data.user.id);
    if (data?.session) logger.log('[Auth]', 'Session created:', !!data.session);
    
    if (!error) {
      auditAuth.signup(email);
      
      // Create profile record for new user
      if (data?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          plan: 'free',
          // Product ladder: every self-serve signup starts on Free (freemium
          // entry funnel). Starter/Pro/Agency are reached via upgrade/checkout.
          // (The handle_new_user DB trigger also creates the row; the column
          // DEFAULT 'free' covers product_tier either way — this is explicit.)
          product_tier: 'free',
          onboarding_progress: { completed: [], dismissed: false },
        } as never);
        if (profileError) {
          logger.error('[Auth]', 'Profile creation failed:', profileError);
        }
      }
    }
    
    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      auditAuth.loginFailed(email, error.message);
    } else {
      auditAuth.loginSuccess(email);
    }
    
    return { error };
  };

  const signOut = async () => {
    auditAuth.logout();
    // CRITICAL: Clear all cached data before signing out to prevent data leakage
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
