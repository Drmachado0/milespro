import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';

export interface ProgramCpfLimit {
  id: string;
  program_name: string;
  default_limit: number;
  renewal_type: 'ano_civil' | '12_meses';
  renewal_date: string | null;
  holder_counts: boolean;
  notes: string | null;
}

export interface UserCpfLimit {
  id: string;
  user_id: string;
  holder_id: string;
  program_name: string;
  custom_limit: number | null;
  period_start: string | null;
}

export interface CpfUsageRecord {
  id: string;
  user_id: string;
  holder_id: string;
  operation_id: string | null;
  program_name: string;
  cpf_count: number;
  emission_date: string;
  passenger_name: string | null;
  locator: string | null;
  created_at: string;
}

// Helper to get current ano civil period
const getAnoCivilPeriod = () => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), 0, 1), // Jan 1st
    end: new Date(now.getFullYear(), 11, 31), // Dec 31st
  };
};

// Helper to get 12-month rolling period
const get12MesesPeriod = (firstEmissionDate: Date) => {
  return {
    start: firstEmissionDate,
    end: new Date(firstEmissionDate.getTime() + 365 * 24 * 60 * 60 * 1000),
  };
};

export function useCpfLimits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch default limits per program
  const { data: defaultLimits = [], isLoading: isLoadingDefaults } = useQuery({
    queryKey: ['program_cpf_limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_cpf_limits')
        .select('*')
        .order('program_name');
      if (error) throw error;
      return (data || []) as ProgramCpfLimit[];
    },
  });

  // Fetch user's custom limits
  const { data: userLimits = [], isLoading: isLoadingUserLimits } = useQuery({
    queryKey: ['user_cpf_limits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_cpf_limits')
        .select('*');
      if (error) throw error;
      return (data || []) as UserCpfLimit[];
    },
    enabled: !!user,
  });

  // Fetch CPF usage records
  const { data: cpfUsage = [], isLoading: isLoadingUsage } = useQuery({
    queryKey: ['cpf_usage_records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpf_usage_records')
        .select('*')
        .order('emission_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CpfUsageRecord[];
    },
    enabled: !!user,
  });

  // Calculate CPF usage for a specific holder and program
  const getCpfUsage = (holderId: string, programName: string) => {
    const defaultLimit = defaultLimits.find(l => l.program_name === programName);
    const userLimit = userLimits.find(l => l.holder_id === holderId && l.program_name === programName);
    
    const limit = userLimit?.custom_limit ?? defaultLimit?.default_limit ?? 10;
    const renewalType = defaultLimit?.renewal_type || 'ano_civil';
    const periodStart = userLimit?.period_start;

    // Get the counting period
    let periodStartDate: Date;
    let periodEndDate: Date;

    if (renewalType === 'ano_civil') {
      const { start, end } = getAnoCivilPeriod();
      periodStartDate = start;
      periodEndDate = end;
    } else {
      // 12_meses - use period_start if set, otherwise use first emission
      const holderUsage = cpfUsage.filter(u => u.holder_id === holderId && u.program_name === programName);
      const firstEmission = periodStart 
        ? new Date(periodStart)
        : holderUsage.length > 0 
          ? new Date(holderUsage[holderUsage.length - 1].emission_date)
          : new Date();
      const { start, end } = get12MesesPeriod(firstEmission);
      periodStartDate = start;
      periodEndDate = end;
    }

    // Count usage within the period
    const usageInPeriod = cpfUsage.filter(u => {
      if (u.holder_id !== holderId || u.program_name !== programName) return false;
      const emissionDate = new Date(u.emission_date);
      return emissionDate >= periodStartDate && emissionDate <= periodEndDate;
    });

    const used = usageInPeriod.reduce((sum, u) => sum + u.cpf_count, 0);
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const isNearLimit = percentage >= 80;
    const isAtLimit = used >= limit;

    return {
      limit,
      used,
      remaining,
      percentage,
      isNearLimit,
      isAtLimit,
      renewalType,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      holderCounts: defaultLimit?.holder_counts ?? false,
    };
  };

  // Mutation to update/create user limit
  const updateUserLimit = useMutation({
    mutationFn: async ({ 
      holderId, 
      programName, 
      customLimit,
      periodStart,
    }: { 
      holderId: string; 
      programName: string; 
      customLimit: number | null;
      periodStart?: string | null;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const existing = userLimits.find(
        l => l.holder_id === holderId && l.program_name === programName
      );

      if (existing) {
        const { error } = await supabase
          .from('user_cpf_limits')
          .update({
            custom_limit: customLimit,
            period_start: periodStart,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_cpf_limits')
          .insert({
            user_id: user.id,
            holder_id: holderId,
            program_name: programName,
            custom_limit: customLimit,
            period_start: periodStart,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_cpf_limits'] });
    },
  });

  // Mutation to add CPF usage record
  const addCpfUsage = useMutation({
    mutationFn: async ({
      holderId,
      operationId,
      programName,
      cpfCount,
      emissionDate,
      passengerName,
      locator,
    }: {
      holderId: string;
      operationId?: string;
      programName: string;
      cpfCount: number;
      emissionDate: string;
      passengerName?: string;
      locator?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('cpf_usage_records')
        .insert({
          user_id: user.id,
          holder_id: holderId,
          operation_id: operationId,
          program_name: programName,
          cpf_count: cpfCount,
          emission_date: emissionDate,
          passenger_name: passengerName,
          locator: locator,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpf_usage_records'] });
    },
  });

  // Mutation to delete CPF usage record
  const deleteCpfUsage = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from('cpf_usage_records')
        .delete()
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpf_usage_records'] });
    },
  });

  // Mutation to add a new program to CPF limits
  const addProgram = useMutation({
    mutationFn: async ({
      programName,
      defaultLimit,
      renewalType,
      holderCounts,
      notes,
    }: {
      programName: string;
      defaultLimit: number;
      renewalType: 'ano_civil' | '12_meses';
      holderCounts: boolean;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('program_cpf_limits')
        .insert({
          program_name: programName,
          default_limit: defaultLimit,
          renewal_type: renewalType,
          holder_counts: holderCounts,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program_cpf_limits'] });
    },
  });

  // Get programs with limits
  const programsWithLimits = useMemo(() => {
    return defaultLimits.map(limit => limit.program_name);
  }, [defaultLimits]);

  return {
    defaultLimits,
    userLimits,
    cpfUsage,
    getCpfUsage,
    updateUserLimit,
    addCpfUsage,
    deleteCpfUsage,
    addProgram,
    programsWithLimits,
    isLoading: isLoadingDefaults || isLoadingUserLimits || isLoadingUsage,
  };
}
