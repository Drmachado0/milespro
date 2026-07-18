import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface SignUpResult {
  error: Error | null;
  data?: {
    user: User | null;
    session: Session | null;
  };
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
