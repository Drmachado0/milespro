/**
 * TypeScript types for Supabase errors
 * 
 * Provides type-safe error handling for authentication and database operations
 */

/**
 * Supabase Authentication Error
 * Returned by auth operations like signIn, signUp, etc.
 */
export interface SupabaseAuthError extends Error {
  /** Error code (e.g., 'user_already_exists', 'invalid_credentials') */
  code?: string;
  /** Additional reasons for the error */
  reasons?: string[];
  /** HTTP status code */
  status?: number;
  /** Weak password reasons (for password validation errors) */
  weak_password?: {
    reasons: string[];
  };
}

/**
 * Supabase Database Error
 * Returned by database operations via the Supabase client
 */
export interface SupabaseDBError extends Error {
  /** PostgreSQL error code */
  code?: string;
  /** Additional error details */
  details?: string;
  /** Hint for resolving the error */
  hint?: string;
  /** Error message */
  message: string;
}

/**
 * Union type for all Supabase errors
 */
export type SupabaseError = SupabaseAuthError | SupabaseDBError;

/**
 * Type guard to check if an error is a SupabaseAuthError
 */
export function isSupabaseAuthError(error: unknown): error is SupabaseAuthError {
  return (
    error instanceof Error &&
    ('code' in error || 'status' in error || 'weak_password' in error)
  );
}

/**
 * Type guard to check if an error is a SupabaseDBError
 */
export function isSupabaseDBError(error: unknown): error is SupabaseDBError {
  return (
    error instanceof Error &&
    ('code' in error || 'details' in error || 'hint' in error)
  );
}

/**
 * Common Supabase auth error codes
 */
export const AUTH_ERROR_CODES = {
  USER_ALREADY_EXISTS: 'user_already_exists',
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  WEAK_PASSWORD: 'weak_password',
  INVALID_EMAIL: 'invalid_email',
  SIGNUP_DISABLED: 'signup_disabled',
  USER_NOT_FOUND: 'user_not_found',
  TOO_MANY_REQUESTS: 'over_request_rate_limit',
} as const;

/**
 * Common PostgreSQL error codes from Supabase
 */
export const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  RLS_VIOLATION: '42501',
} as const;
