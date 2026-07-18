import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface IssuedTicketReportRow {
  date: string;
  program: string;
  holder: string;
  passenger: string;
  locator: string;
  cpfCount: number;
  milesUsed: number;
  estimatedCashValue: number;
  estimatedSavings: number;
  costPerMile: number;
}

export interface RouteFrequency {
  route: string;
  count: number;
  totalMiles: number;
}

export interface ProgramDistribution {
  program: string;
  totalMiles: number;
  totalEmissions: number;
  percentage: number;
}

export interface HolderDistribution {
  holder: string;
  totalMiles: number;
  totalEmissions: number;
  percentage: number;
}

export interface IssuedTicketsSummary {
  totalEmissions: number;
  totalMilesUsed: number;
  uniquePassengers: number;
  totalCpfsUsed: number;
  averageCostPerMile: number;
  estimatedTotalSavings: number;
  averageMilesPerEmission: number;
}

export interface IssuedTicketsFilters {
  holderId: string;
  programId: string;
  startDate: string;
  endDate: string;
}

// Average cash price per mile for savings estimation (R$ 0.08 per mile = R$ 80/1000 miles)
const AVERAGE_CASH_PRICE_PER_MILE = 0.08;

export function useIssuedTicketsReport(filters: IssuedTicketsFilters) {
  const { user } = useAuth();

  // Fetch resgate operations
  const { data: operations = [], isLoading: loadingOperations } = useQuery({
    queryKey: ['issued-tickets-report', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'resgate')
        .order('date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.holderId && filters.holderId !== 'all') {
        query = query.eq('holder_id', filters.holderId);
      }
      if (filters.programId && filters.programId !== 'all') {
        query = query.eq('program', filters.programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch holders for filters
  const { data: holders = [] } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('holders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Parse passenger info from notes
  const parsePassengerInfo = (notes: string | null) => {
    if (!notes) return { passenger: '-', locator: '-', cpfCount: 1 };
    
    let passenger = '-';
    let locator = '-';
    let cpfCount = 1;

    // Try to extract passenger name
    const passengerMatch = notes.match(/Passageiro:\s*([^|;\n]+)/i) || 
                          notes.match(/Passageiro\s*-?\s*([^|;\n]+)/i) ||
                          notes.match(/Nome:\s*([^|;\n]+)/i);
    if (passengerMatch) {
      passenger = passengerMatch[1].trim();
    }

    // Try to extract locator
    const locatorMatch = notes.match(/Localizador:\s*([A-Z0-9]+)/i) ||
                        notes.match(/Loc:\s*([A-Z0-9]+)/i) ||
                        notes.match(/\b([A-Z0-9]{6})\b/);
    if (locatorMatch) {
      locator = locatorMatch[1].toUpperCase();
    }

    // Try to extract CPF count
    const cpfMatch = notes.match(/CPFs?:\s*(\d+)/i) ||
                    notes.match(/(\d+)\s*CPFs?/i);
    if (cpfMatch) {
      cpfCount = parseInt(cpfMatch[1], 10);
    }

    return { passenger, locator, cpfCount };
  };

  // Process report data
  const reportData = useMemo<IssuedTicketReportRow[]>(() => {
    return operations.map((op) => {
      const { passenger, locator, cpfCount } = parsePassengerInfo(op.notes);
      const estimatedCashValue = op.quantity * AVERAGE_CASH_PRICE_PER_MILE;
      const actualCost = op.total_cost || 0;
      const costPerMile = op.quantity > 0 ? (actualCost / op.quantity) : 0;
      
      return {
        date: format(parseISO(op.date), 'dd/MM/yyyy'),
        program: op.program,
        holder: op.holder_name || '-',
        passenger,
        locator,
        cpfCount,
        milesUsed: op.quantity,
        estimatedCashValue,
        estimatedSavings: Math.max(0, estimatedCashValue - actualCost),
        costPerMile: costPerMile * 1000, // Cost per 1000 miles
      };
    });
  }, [operations]);

  // Program distribution
  const programDistribution = useMemo<ProgramDistribution[]>(() => {
    const programMap = new Map<string, { miles: number; count: number }>();
    let totalMiles = 0;

    operations.forEach((op) => {
      const current = programMap.get(op.program) || { miles: 0, count: 0 };
      current.miles += op.quantity;
      current.count += 1;
      totalMiles += op.quantity;
      programMap.set(op.program, current);
    });

    const result: ProgramDistribution[] = [];
    programMap.forEach((data, program) => {
      result.push({
        program,
        totalMiles: data.miles,
        totalEmissions: data.count,
        percentage: totalMiles > 0 ? (data.miles / totalMiles) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.totalMiles - a.totalMiles);
  }, [operations]);

  // Holder distribution
  const holderDistribution = useMemo<HolderDistribution[]>(() => {
    const holderMap = new Map<string, { miles: number; count: number }>();
    let totalMiles = 0;

    operations.forEach((op) => {
      const holderName = op.holder_name || 'Sem Titular';
      const current = holderMap.get(holderName) || { miles: 0, count: 0 };
      current.miles += op.quantity;
      current.count += 1;
      totalMiles += op.quantity;
      holderMap.set(holderName, current);
    });

    const result: HolderDistribution[] = [];
    holderMap.forEach((data, holder) => {
      result.push({
        holder,
        totalMiles: data.miles,
        totalEmissions: data.count,
        percentage: totalMiles > 0 ? (data.miles / totalMiles) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.totalMiles - a.totalMiles);
  }, [operations]);

  // Monthly evolution
  const monthlyEvolution = useMemo(() => {
    const monthMap = new Map<string, { miles: number; count: number; savings: number }>();

    operations.forEach((op) => {
      const monthKey = format(parseISO(op.date), 'yyyy-MM');
      const current = monthMap.get(monthKey) || { miles: 0, count: 0, savings: 0 };
      const estimatedCash = op.quantity * AVERAGE_CASH_PRICE_PER_MILE;
      const actualCost = op.total_cost || 0;
      
      current.miles += op.quantity;
      current.count += 1;
      current.savings += Math.max(0, estimatedCash - actualCost);
      monthMap.set(monthKey, current);
    });

    const result: { month: string; milesUsed: number; emissions: number; savings: number }[] = [];
    monthMap.forEach((data, monthKey) => {
      result.push({
        month: format(parseISO(`${monthKey}-01`), 'MMM/yy', { locale: ptBR }),
        milesUsed: data.miles,
        emissions: data.count,
        savings: data.savings,
      });
    });

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [operations]);

  // Summary stats
  const summary = useMemo<IssuedTicketsSummary>(() => {
    const uniquePassengers = new Set<string>();
    let totalCpfs = 0;
    let totalCost = 0;

    operations.forEach((op) => {
      const { passenger, cpfCount } = parsePassengerInfo(op.notes);
      if (passenger && passenger !== '-') {
        uniquePassengers.add(passenger.toLowerCase());
      }
      totalCpfs += cpfCount;
      totalCost += op.total_cost || 0;
    });

    const totalMiles = operations.reduce((sum, op) => sum + op.quantity, 0);
    const estimatedCashTotal = totalMiles * AVERAGE_CASH_PRICE_PER_MILE;

    return {
      totalEmissions: operations.length,
      totalMilesUsed: totalMiles,
      uniquePassengers: uniquePassengers.size,
      totalCpfsUsed: totalCpfs,
      averageCostPerMile: totalMiles > 0 ? (totalCost / totalMiles) * 1000 : 0,
      estimatedTotalSavings: Math.max(0, estimatedCashTotal - totalCost),
      averageMilesPerEmission: operations.length > 0 ? totalMiles / operations.length : 0,
    };
  }, [operations]);

  return {
    reportData,
    programDistribution,
    holderDistribution,
    monthlyEvolution,
    summary,
    holders,
    isLoading: loadingOperations,
  };
}
