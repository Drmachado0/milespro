import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';

// Simplified bonus types
export type BonusType = 'none' | 'recurring';
// Expanded frequency options
export type BonusFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'yearly';
export type Modality = 'monthly' | 'annual_installments' | 'annual_upfront';

// Frequency labels and occurrences per year
export const BONUS_FREQUENCY_CONFIG: Record<BonusFrequency, { label: string; occurrences: number; months: number }> = {
  monthly: { label: 'Mensal', occurrences: 12, months: 1 },
  bimonthly: { label: 'Bimestral', occurrences: 6, months: 2 },
  quarterly: { label: 'Trimestral', occurrences: 4, months: 3 },
  biannual: { label: 'Semestral', occurrences: 2, months: 6 },
  yearly: { label: 'Anual', occurrences: 1, months: 12 },
};

export interface ClubSubscription {
  id: string;
  user_id: string;
  holder_id: string | null;
  program: string;
  subscription_name: string | null;
  points_per_month: number;
  monthly_fee: number;
  annual_price: number | null;
  annual_installment_price: number | null;
  modality: Modality;
  initial_bonus: number;
  initial_bonus_applied: boolean;
  initial_bonus_applied_at: string | null;
  billing_day: number | null;
  credit_card_id: string | null;
  active: boolean;
  notes: string | null;
  // Recurring bonus fields
  bonus_type: BonusType;
  bonus_value: number; // Points given at each recurrence
  bonus_frequency: BonusFrequency;
  start_date: string | null;
  last_points_generated_at: string | null;
  last_bonus_generated_at: string | null;
  total_points_generated: number;
  total_bonuses_received: number;
  total_amount_paid: number;
  created_at: string;
  updated_at: string;
  holders?: { name: string } | null;
  credit_cards?: { card_name: string } | null;
}

export interface CreateSubscriptionData {
  holder_id?: string | null;
  program: string;
  subscription_name?: string | null;
  points_per_month: number;
  monthly_fee: number;
  annual_price?: number | null;
  annual_installment_price?: number | null;
  modality?: Modality;
  initial_bonus?: number;
  billing_day?: number | null;
  credit_card_id?: string | null;
  notes?: string | null;
  bonus_type?: BonusType;
  bonus_value?: number;
  bonus_frequency?: BonusFrequency;
  start_date?: string | null;
}

export interface ModalityProjection {
  modality: Modality;
  label: string;
  totalCost: number;
  monthlyEquivalent: number;
  totalMonthlyPoints: number;
  initialBonus: number;
  recurringBonusTotal: number;
  totalBonusPoints: number;
  totalPoints: number;
  costPerThousandBase: number;
  costPerThousandWithBonus: number;
  savings: number;
  bonusOccurrences: number;
}

export interface FirstYearProjection {
  totalMonths: number;
  totalMonthlyPoints: number;
  initialBonus: number;
  recurringBonusTotal: number;
  totalBonusPoints: number;
  totalPoints: number;
  totalCost: number;
  costPerThousandBase: number;
  costPerThousandWithBonus: number;
  bonusOccurrences: number;
}

export function useClubSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['club_subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('club_subscriptions')
        .select(`
          *,
          holders(name),
          credit_cards(card_name)
        `)
        .eq('user_id', user.id) // Explicit filter for defense in depth
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ClubSubscription[];
    },
    enabled: !!user?.id,
  });

  const createSubscription = useMutation({
    mutationFn: async (data: CreateSubscriptionData) => {
      const { error } = await supabase
        .from('club_subscriptions')
        .insert({
          user_id: user!.id,
          holder_id: data.holder_id ?? undefined,
          program: data.program,
          subscription_name: data.subscription_name ?? undefined,
          points_per_month: data.points_per_month,
          monthly_fee: data.monthly_fee,
          annual_price: data.annual_price ?? undefined,
          annual_installment_price: data.annual_installment_price ?? undefined,
          modality: data.modality || 'monthly',
          initial_bonus: data.initial_bonus || 0,
          billing_day: data.billing_day ?? undefined,
          credit_card_id: data.credit_card_id ?? undefined,
          notes: data.notes ?? undefined,
          bonus_type: data.bonus_type || 'none',
          bonus_value: data.bonus_value || 0,
          bonus_frequency: data.bonus_frequency || 'quarterly',
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          active: true,
          initial_bonus_applied: false,
        } as never);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club_subscriptions'] });
      toast.success('Assinatura criada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSubscriptionData & { active: boolean }> }) => {
      const { error } = await supabase
        .from('club_subscriptions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club_subscriptions'] });
      toast.success('Assinatura atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('club_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club_subscriptions'] });
      toast.success('Assinatura excluída com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('club_subscriptions')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['club_subscriptions'] });
      toast.success(active ? 'Assinatura ativada!' : 'Assinatura cancelada!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Calculate cost per thousand (base, without bonus)
  const calculateCostPerThousand = (monthlyFee: number, pointsPerMonth: number): number => {
    if (pointsPerMonth <= 0) return 0;
    return (monthlyFee / pointsPerMonth) * 1000;
  };

  // Calculate recurring bonus occurrences and total for 1st year
  const calculateRecurringBonus = (
    bonusType: BonusType,
    bonusValue: number,
    bonusFrequency: BonusFrequency
  ): { occurrences: number; totalPoints: number } => {
    if (bonusType !== 'recurring' || bonusValue <= 0) {
      return { occurrences: 0, totalPoints: 0 };
    }
    const config = BONUS_FREQUENCY_CONFIG[bonusFrequency];
    return {
      occurrences: config.occurrences,
      totalPoints: Math.floor(bonusValue * config.occurrences),
    };
  };

  // Calculate projection for each modality with full bonus breakdown
  const calculateModalityProjection = (
    monthlyFee: number,
    annualInstallmentPrice: number | null,
    annualPrice: number | null,
    pointsPerMonth: number,
    initialBonus: number,
    bonusType: BonusType = 'none',
    bonusValue: number = 0,
    bonusFrequency: BonusFrequency = 'quarterly'
  ): ModalityProjection[] => {
    const totalMonths = 12;
    const totalMonthlyPoints = pointsPerMonth * totalMonths;
    const recurring = calculateRecurringBonus(bonusType, bonusValue, bonusFrequency);
    const totalBonusPoints = initialBonus + recurring.totalPoints;
    
    const projections: ModalityProjection[] = [];
    
    // Monthly
    const monthlyTotalCost = monthlyFee * totalMonths;
    const monthlyTotalPoints = totalMonthlyPoints + totalBonusPoints;
    projections.push({
      modality: 'monthly',
      label: 'Mensal',
      totalCost: monthlyTotalCost,
      monthlyEquivalent: monthlyFee,
      totalMonthlyPoints,
      initialBonus,
      recurringBonusTotal: recurring.totalPoints,
      totalBonusPoints,
      totalPoints: monthlyTotalPoints,
      costPerThousandBase: totalMonthlyPoints > 0 ? (monthlyTotalCost / totalMonthlyPoints) * 1000 : 0,
      costPerThousandWithBonus: monthlyTotalPoints > 0 ? (monthlyTotalCost / monthlyTotalPoints) * 1000 : 0,
      savings: 0,
      bonusOccurrences: recurring.occurrences,
    });

    // Annual Installments (12x)
    if (annualInstallmentPrice && annualInstallmentPrice > 0) {
      const totalInstallmentCost = annualInstallmentPrice * 12;
      const annualInstallmentTotalPoints = totalMonthlyPoints + totalBonusPoints;
      projections.push({
        modality: 'annual_installments',
        label: 'Anual (12x)',
        totalCost: totalInstallmentCost,
        monthlyEquivalent: annualInstallmentPrice,
        totalMonthlyPoints,
        initialBonus,
        recurringBonusTotal: recurring.totalPoints,
        totalBonusPoints,
        totalPoints: annualInstallmentTotalPoints,
        costPerThousandBase: totalMonthlyPoints > 0 ? (totalInstallmentCost / totalMonthlyPoints) * 1000 : 0,
        costPerThousandWithBonus: annualInstallmentTotalPoints > 0 ? (totalInstallmentCost / annualInstallmentTotalPoints) * 1000 : 0,
        savings: monthlyTotalCost - totalInstallmentCost,
        bonusOccurrences: recurring.occurrences,
      });
    }

    // Annual Upfront
    if (annualPrice && annualPrice > 0) {
      const annualTotalPoints = totalMonthlyPoints + totalBonusPoints;
      projections.push({
        modality: 'annual_upfront',
        label: 'Anual (à vista)',
        totalCost: annualPrice,
        monthlyEquivalent: annualPrice / 12,
        totalMonthlyPoints,
        initialBonus,
        recurringBonusTotal: recurring.totalPoints,
        totalBonusPoints,
        totalPoints: annualTotalPoints,
        costPerThousandBase: totalMonthlyPoints > 0 ? (annualPrice / totalMonthlyPoints) * 1000 : 0,
        costPerThousandWithBonus: annualTotalPoints > 0 ? (annualPrice / annualTotalPoints) * 1000 : 0,
        savings: monthlyTotalCost - annualPrice,
        bonusOccurrences: recurring.occurrences,
      });
    }

    return projections;
  };

  // Calculate first year projection
  const calculateFirstYearProjection = (
    monthlyFee: number,
    pointsPerMonth: number,
    bonusType: BonusType,
    bonusValue: number,
    bonusFrequency: BonusFrequency,
    initialBonus: number = 0,
    modality: Modality = 'monthly',
    annualPrice: number | null = null,
    annualInstallmentPrice: number | null = null
  ): FirstYearProjection => {
    const totalMonths = 12;
    const totalMonthlyPoints = pointsPerMonth * totalMonths;
    
    // Determine total cost based on modality
    let totalCost = monthlyFee * totalMonths;
    if (modality === 'annual_upfront' && annualPrice) {
      totalCost = annualPrice;
    } else if (modality === 'annual_installments' && annualInstallmentPrice) {
      totalCost = annualInstallmentPrice * 12;
    }

    // Calculate recurring bonus for 1st year
    const recurring = calculateRecurringBonus(bonusType, bonusValue, bonusFrequency);
    
    // Total bonus = initial bonus (1st month only) + recurring bonus (1st year)
    const totalBonusPoints = initialBonus + recurring.totalPoints;
    const totalPoints = totalMonthlyPoints + totalBonusPoints;

    return {
      totalMonths,
      totalMonthlyPoints,
      initialBonus,
      recurringBonusTotal: recurring.totalPoints,
      totalBonusPoints,
      totalPoints,
      totalCost,
      costPerThousandBase: totalMonthlyPoints > 0 ? (totalCost / totalMonthlyPoints) * 1000 : 0,
      costPerThousandWithBonus: totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0,
      bonusOccurrences: recurring.occurrences,
    };
  };

  // Get active subscriptions count
  const activeCount = subscriptions.filter(s => s.active).length;
  
  // Get total monthly cost (adjusted for modality)
  const totalMonthlyCost = subscriptions
    .filter(s => s.active)
    .reduce((sum, s) => {
      if (s.modality === 'annual_upfront' && s.annual_price) {
        return sum + (s.annual_price / 12);
      } else if (s.modality === 'annual_installments' && s.annual_installment_price) {
        return sum + s.annual_installment_price; // installment value IS the monthly equivalent
      }
      return sum + (s.monthly_fee || 0);
    }, 0);
  
  // Get total points per month
  const totalPointsPerMonth = subscriptions
    .filter(s => s.active)
    .reduce((sum, s) => sum + (s.points_per_month || 0), 0);

  // Calculate overall average cost per thousand with bonuses
  const calculateOverallStats = () => {
    const activeSubscriptions = subscriptions.filter(s => s.active);
    if (activeSubscriptions.length === 0) {
      return { avgCostBase: 0, avgCostWithBonus: 0, totalYearlyPoints: 0, totalYearlyCost: 0 };
    }

    let totalYearlyPoints = 0;
    let totalYearlyBonusPoints = 0;
    let totalYearlyCost = 0;

    activeSubscriptions.forEach(sub => {
      const projection = calculateFirstYearProjection(
        sub.monthly_fee || 0,
        sub.points_per_month || 0,
        (sub.bonus_type as BonusType) || 'none',
        sub.bonus_value || 0,
        (sub.bonus_frequency as BonusFrequency) || 'quarterly',
        sub.initial_bonus || 0,
        (sub.modality as Modality) || 'monthly',
        sub.annual_price,
        sub.annual_installment_price
      );
      totalYearlyPoints += projection.totalMonthlyPoints;
      totalYearlyBonusPoints += projection.totalBonusPoints;
      totalYearlyCost += projection.totalCost;
    });

    const totalWithBonus = totalYearlyPoints + totalYearlyBonusPoints;

    return {
      avgCostBase: totalYearlyPoints > 0 ? (totalYearlyCost / totalYearlyPoints) * 1000 : 0,
      avgCostWithBonus: totalWithBonus > 0 ? (totalYearlyCost / totalWithBonus) * 1000 : 0,
      totalYearlyPoints: totalWithBonus,
      totalYearlyCost,
    };
  };

  return {
    subscriptions,
    isLoading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    toggleActive,
    calculateCostPerThousand,
    calculateRecurringBonus,
    calculateModalityProjection,
    calculateFirstYearProjection,
    calculateOverallStats,
    activeCount,
    totalMonthlyCost,
    totalPointsPerMonth,
  };
}