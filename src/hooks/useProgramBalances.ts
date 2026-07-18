import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { computeProgramBalances, type ProgramBalance } from '@/lib/computeBalances';

export type { ProgramBalance };

// Reducer logic lives in `src/lib/computeBalances.ts` so every screen that
// asks "what is the current mile balance?" arrives at the same number
// (QA audit sas.txt Bug 3 — Dashboard/Titulares/Relatórios/Análise
// disagreed by hundreds of thousands of miles before the consolidation).

export function useProgramBalances() {
  const { user } = useAuth();

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id) // Explicit filter for defense in depth
        .eq('status', 'confirmado')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const balances = useMemo(() => computeProgramBalances(operations), [operations]);

  const totalBalance = useMemo(() => 
    balances.reduce((sum, b) => sum + b.balance, 0), 
    [balances]
  );

  const totalInvested = useMemo(() => 
    balances.reduce((sum, b) => sum + b.totalInvested, 0), 
    [balances]
  );

  const getBalanceByProgram = (program: string): ProgramBalance | undefined => {
    return balances.find(b => b.program === program);
  };

  return {
    balances,
    totalBalance,
    totalInvested,
    isLoading,
    getBalanceByProgram,
  };
}
