import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { Database } from '@/integrations/supabase/types';

type Operation = Database['public']['Tables']['operations']['Row'];

export interface TaxMonthData {
  month: string;
  monthLabel: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  isExempt: boolean;
  taxDue: number;
  operations: number;
  milesSold: number;
  costPerThousand: number;
  percentOfLimit: number;
}

export interface TaxProgramData {
  program: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  milesSold: number;
  costPerThousand: number;
  [key: string]: unknown;
}

export interface TaxSummary {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalTaxDue: number;
  exemptMonths: number;
  taxableMonths: number;
  totalMilesSold: number;
  avgCostPerThousand: number;
}

export interface QuarterlySummary {
  quarter: string;
  label: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  taxDue: number;
  months: number[];
}

export interface CurrentMonthAlert {
  isNearLimit: boolean;
  currentSales: number;
  percentOfLimit: number;
  remaining: number;
  level: 'safe' | 'warning' | 'danger';
}

export interface YearOverYearComparison {
  previousYearTax: number;
  currentYearTax: number;
  previousYearSales: number;
  currentYearSales: number;
  variation: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AssetsDeclaration {
  totalPurchased: number;
  mustDeclare: boolean;
  threshold: number;
}

const MONTHLY_EXEMPTION_LIMIT = 35000;
const TAX_RATE = 0.15;
const ASSET_DECLARATION_THRESHOLD = 5000;

function calculateTax(monthlySales: number, profit: number): number {
  if (monthlySales <= MONTHLY_EXEMPTION_LIMIT) return 0;
  if (profit <= 0) return 0;
  return profit * TAX_RATE;
}

function getAlertLevel(percentOfLimit: number): 'safe' | 'warning' | 'danger' {
  if (percentOfLimit >= 100) return 'danger';
  if (percentOfLimit >= 80) return 'warning';
  return 'safe';
}

export function useIncomeTaxReport(filters: {
  startDate: Date;
  endDate: Date;
  program?: string;
  holderId?: string;
}) {
  const { user } = useAuth();

  const selectedYear = filters.startDate.getFullYear();
  const previousYear = selectedYear - 1;

  // Fetch operations for the selected period (for sales)
  const { data: operations, isLoading: loadingOperations } = useQuery({
    queryKey: ['income-tax-operations', user?.id, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.program, filters.holderId],
    queryFn: async () => {
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', format(filters.startDate, 'yyyy-MM-dd'))
        .lte('date', format(filters.endDate, 'yyyy-MM-dd'))
        .in('type', ['compra', 'venda', 'compra_turbinada']);

      if (filters.program) {
        query = query.eq('program', filters.program);
      }

      if (filters.holderId) {
        query = query.eq('holder_id', filters.holderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Operation[];
    },
    enabled: !!user?.id,
  });

  // Fetch ALL purchase operations up to the end date to calculate average cost per program
  const { data: allPurchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['income-tax-all-purchases', user?.id, filters.endDate.toISOString(), filters.program, filters.holderId],
    queryFn: async () => {
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user!.id)
        .lte('date', format(filters.endDate, 'yyyy-MM-dd'))
        .in('type', ['compra', 'compra_turbinada']);

      if (filters.program) {
        query = query.eq('program', filters.program);
      }

      if (filters.holderId) {
        query = query.eq('holder_id', filters.holderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Operation[];
    },
    enabled: !!user?.id,
  });

  // Fetch previous year sales for year-over-year comparison
  const { data: previousYearOps, isLoading: loadingPrevYear } = useQuery({
    queryKey: ['income-tax-prev-year', user?.id, previousYear, filters.program, filters.holderId],
    queryFn: async () => {
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', `${previousYear}-01-01`)
        .lte('date', `${previousYear}-12-31`)
        .eq('type', 'venda');

      if (filters.program) {
        query = query.eq('program', filters.program);
      }

      if (filters.holderId) {
        query = query.eq('holder_id', filters.holderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Operation[];
    },
    enabled: !!user?.id,
  });

  // Calculate average cost per program from ALL historical purchases
  const programCostMap = useMemo(() => {
    if (!allPurchases || allPurchases.length === 0) return new Map<string, number>();

    const programData = new Map<string, { totalCost: number; totalQty: number }>();

    allPurchases.forEach((op) => {
      const program = op.program || 'Outros';
      const current = programData.get(program) || { totalCost: 0, totalQty: 0 };
      current.totalCost += op.total_cost || 0;
      current.totalQty += op.quantity || 0;
      programData.set(program, current);
    });

    const avgCostMap = new Map<string, number>();
    programData.forEach((data, program) => {
      avgCostMap.set(program, data.totalQty > 0 ? data.totalCost / data.totalQty : 0);
    });

    return avgCostMap;
  }, [allPurchases]);

  // Calculate global average cost for fallback and summary
  const globalAvgCostPerMile = useMemo(() => {
    if (!allPurchases || allPurchases.length === 0) return 0;

    const totalCost = allPurchases.reduce((sum, op) => sum + (op.total_cost || 0), 0);
    const totalQuantity = allPurchases.reduce((sum, op) => sum + (op.quantity || 0), 0);

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }, [allPurchases]);

  // Helper function to get cost per mile for a program
  const getCostPerMile = useCallback((program: string): number => {
    return programCostMap.get(program) || globalAvgCostPerMile;
  }, [programCostMap, globalAvgCostPerMile]);

  const monthlyData = useMemo(() => {
    if (!operations) return [];

    const months = eachMonthOfInterval({
      start: filters.startDate,
      end: filters.endDate,
    });

    return months.map((monthDate): TaxMonthData => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM/yyyy');

      const monthOps = operations.filter((op) => {
        const opDate = parseISO(op.date);
        return opDate >= monthStart && opDate <= monthEnd;
      });

      const salesOps = monthOps.filter((op) => op.type === 'venda');
      const totalSales = salesOps.reduce((sum, op) => sum + (op.total_cost || 0), 0);
      const milesSold = salesOps.reduce((sum, op) => sum + (op.quantity || 0), 0);

      // Calculate cost using program-specific average costs
      let totalCost = 0;
      salesOps.forEach((op) => {
        const costPerMile = getCostPerMile(op.program || 'Outros');
        totalCost += (op.quantity || 0) * costPerMile;
      });

      const costPerThousand = milesSold > 0 ? (totalCost / milesSold) * 1000 : 0;

      const profit = totalSales - totalCost;
      const isExempt = totalSales <= MONTHLY_EXEMPTION_LIMIT;
      const taxDue = calculateTax(totalSales, profit);
      const percentOfLimit = (totalSales / MONTHLY_EXEMPTION_LIMIT) * 100;

      return {
        month: monthKey,
        monthLabel,
        totalSales,
        totalCost,
        profit,
        isExempt,
        taxDue,
        operations: monthOps.length,
        milesSold,
        costPerThousand,
        percentOfLimit,
      };
    });
  }, [operations, filters.startDate, filters.endDate, getCostPerMile]);

  // Program data - now without IR column (IR is calculated monthly, not per program)
  const programData = useMemo(() => {
    if (!operations) return [];

    const programMap = new Map<string, { sales: number; soldQty: number }>();

    operations.forEach((op) => {
      const program = op.program || 'Outros';
      if (!programMap.has(program)) {
        programMap.set(program, { sales: 0, soldQty: 0 });
      }

      const data = programMap.get(program)!;

      if (op.type === 'venda') {
        data.sales += op.total_cost || 0;
        data.soldQty += op.quantity || 0;
      }
    });

    return Array.from(programMap.entries()).map(([program, data]): TaxProgramData => {
      const costPerMile = getCostPerMile(program);
      const totalCost = data.soldQty * costPerMile;
      const profit = data.sales - totalCost;
      const costPerThousand = costPerMile * 1000;

      return {
        program,
        totalSales: data.sales,
        totalCost,
        profit,
        milesSold: data.soldQty,
        costPerThousand,
      };
    }).filter((p) => p.totalSales > 0);
  }, [operations, getCostPerMile]);

  const summary = useMemo((): TaxSummary => {
    const totalSales = monthlyData.reduce((sum, m) => sum + m.totalSales, 0);
    const totalCost = monthlyData.reduce((sum, m) => sum + m.totalCost, 0);
    const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);
    const totalTaxDue = monthlyData.reduce((sum, m) => sum + m.taxDue, 0);
    const exemptMonths = monthlyData.filter((m) => m.isExempt).length;
    const taxableMonths = monthlyData.filter((m) => !m.isExempt && m.taxDue > 0).length;
    const totalMilesSold = monthlyData.reduce((sum, m) => sum + m.milesSold, 0);

    return {
      totalSales,
      totalCost,
      totalProfit,
      totalTaxDue,
      exemptMonths,
      taxableMonths,
      totalMilesSold,
      avgCostPerThousand: globalAvgCostPerMile * 1000,
    };
  }, [monthlyData, globalAvgCostPerMile]);

  const quarterlySummary = useMemo((): QuarterlySummary[] => {
    const quarters: QuarterlySummary[] = [
      { quarter: 'Q1', label: 'Jan-Mar', totalSales: 0, totalCost: 0, profit: 0, taxDue: 0, months: [0, 1, 2] },
      { quarter: 'Q2', label: 'Abr-Jun', totalSales: 0, totalCost: 0, profit: 0, taxDue: 0, months: [3, 4, 5] },
      { quarter: 'Q3', label: 'Jul-Set', totalSales: 0, totalCost: 0, profit: 0, taxDue: 0, months: [6, 7, 8] },
      { quarter: 'Q4', label: 'Out-Dez', totalSales: 0, totalCost: 0, profit: 0, taxDue: 0, months: [9, 10, 11] },
    ];

    monthlyData.forEach((m) => {
      const monthIndex = parseInt(m.month.split('-')[1]) - 1;
      const quarterIndex = Math.floor(monthIndex / 3);
      if (quarterIndex >= 0 && quarterIndex < 4) {
        quarters[quarterIndex].totalSales += m.totalSales;
        quarters[quarterIndex].totalCost += m.totalCost;
        quarters[quarterIndex].profit += m.profit;
        quarters[quarterIndex].taxDue += m.taxDue;
      }
    });

    return quarters;
  }, [monthlyData]);

  const currentMonthAlert = useMemo((): CurrentMonthAlert => {
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const currentMonthData = monthlyData.find((m) => m.month === currentMonthKey);

    if (!currentMonthData) {
      return {
        isNearLimit: false,
        currentSales: 0,
        percentOfLimit: 0,
        remaining: MONTHLY_EXEMPTION_LIMIT,
        level: 'safe',
      };
    }

    const percentOfLimit = currentMonthData.percentOfLimit;
    const remaining = Math.max(0, MONTHLY_EXEMPTION_LIMIT - currentMonthData.totalSales);

    return {
      isNearLimit: percentOfLimit >= 80,
      currentSales: currentMonthData.totalSales,
      percentOfLimit,
      remaining,
      level: getAlertLevel(percentOfLimit),
    };
  }, [monthlyData]);

  // Year-over-year comparison
  const yearOverYearComparison = useMemo((): YearOverYearComparison | null => {
    if (!previousYearOps) return null;

    // Calculate previous year totals
    const prevYearSales = previousYearOps.reduce((sum, op) => sum + (op.total_cost || 0), 0);

    // Previous-year tax estimate. The earlier version assumed a flat 30%
    // profit margin "when we don't have cost data" — but we DO have it:
    // programCostMap and globalAvgCostPerMile already model historical costs.
    // Replace the flat margin with the same getCostPerMile() lookup used for
    // the current-year monthly data so YoY swings reflect the user's actual
    // cost basis instead of an arbitrary constant.
    type PrevMonthBucket = { sales: number; estimatedCost: number };
    const prevYearMonthlyAggregate: Record<string, PrevMonthBucket> = {};
    previousYearOps.forEach((op) => {
      const month = format(parseISO(op.date), 'yyyy-MM');
      if (!prevYearMonthlyAggregate[month]) {
        prevYearMonthlyAggregate[month] = { sales: 0, estimatedCost: 0 };
      }
      const sales = op.total_cost || 0;
      const qty = op.quantity || 0;
      const costPerMile = getCostPerMile(op.program || 'Outros');
      prevYearMonthlyAggregate[month].sales += sales;
      prevYearMonthlyAggregate[month].estimatedCost += qty * costPerMile;
    });

    let prevYearTax = 0;
    Object.values(prevYearMonthlyAggregate).forEach((bucket) => {
      const profit = bucket.sales - bucket.estimatedCost;
      prevYearTax += calculateTax(bucket.sales, profit);
    });

    const currentYearTax = summary.totalTaxDue;
    const currentYearSales = summary.totalSales;

    const variation = prevYearTax > 0 
      ? ((currentYearTax - prevYearTax) / prevYearTax) * 100 
      : currentYearTax > 0 ? 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (variation > 5) trend = 'up';
    if (variation < -5) trend = 'down';

    return {
      previousYearTax: prevYearTax,
      currentYearTax,
      previousYearSales: prevYearSales,
      currentYearSales,
      variation,
      trend,
    };
  }, [previousYearOps, summary, getCostPerMile]);

  // Asset declaration calculation - based on purchases in the selected year
  const assetsDeclaration = useMemo((): AssetsDeclaration => {
    if (!allPurchases) {
      return {
        totalPurchased: 0,
        mustDeclare: false,
        threshold: ASSET_DECLARATION_THRESHOLD,
      };
    }

    // Filter purchases only from the selected year
    const yearPurchases = allPurchases.filter((op) => {
      const opYear = new Date(op.date).getFullYear();
      return opYear === selectedYear;
    });

    const totalPurchased = yearPurchases.reduce((sum, op) => sum + (op.total_cost || 0), 0);

    return {
      totalPurchased,
      mustDeclare: totalPurchased > ASSET_DECLARATION_THRESHOLD,
      threshold: ASSET_DECLARATION_THRESHOLD,
    };
  }, [allPurchases, selectedYear]);

  return {
    monthlyData,
    programData,
    summary,
    quarterlySummary,
    currentMonthAlert,
    yearOverYearComparison,
    assetsDeclaration,
    isLoading: loadingOperations || loadingPurchases || loadingPrevYear,
    exemptionLimit: MONTHLY_EXEMPTION_LIMIT,
    taxRate: TAX_RATE,
    assetThreshold: ASSET_DECLARATION_THRESHOLD,
    selectedYear,
    previousYear,
  };
}
