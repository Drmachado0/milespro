import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';
import { vipQueryKeys } from './useVIPEntries';

export interface VIPCounter {
  cardId: string;
  cardName: string;
  lastFourDigits: string | null;
  holderName: string | null;
  linkedProgram: string | null;
  
  // Cota Titular
  titularQuota: number | null;
  titularUsed: number;
  titularRemaining: number | 'unlimited';
  titularStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
  isTitularUnlimited: boolean;
  
  // Cota Convidado
  convidadoQuota: number | null;
  convidadoUsed: number;
  convidadoRemaining: number | 'unlimited';
  convidadoStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
  isConvidadoUnlimited: boolean;
  
  // Status geral (pior dos dois)
  overallStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
  
  lastThreeMonths: { month: string; titular: number; convidado: number }[];
}

function calculateStatus(quota: number | null, used: number): { 
  remaining: number | 'unlimited'; 
  status: 'safe' | 'warning' | 'critical' | 'unlimited';
  isUnlimited: boolean;
} {
  // null = unlimited
  if (quota === null) {
    return { remaining: 'unlimited', status: 'unlimited', isUnlimited: true };
  }
  
  const remaining = Math.max(0, quota - used);
  let status: 'safe' | 'warning' | 'critical' = 'safe';
  
  if (quota > 0) {
    const remainingPercentage = (remaining / quota) * 100;
    if (remainingPercentage < 20 || remaining <= 2) {
      status = 'critical';
    } else if (remainingPercentage < 50 || remaining <= 5) {
      status = 'warning';
    }
  }
  
  return { remaining, status, isUnlimited: false };
}

function getOverallStatus(
  titularStatus: 'safe' | 'warning' | 'critical' | 'unlimited',
  convidadoStatus: 'safe' | 'warning' | 'critical' | 'unlimited'
): 'safe' | 'warning' | 'critical' | 'unlimited' {
  const statusOrder = { critical: 0, warning: 1, safe: 2, unlimited: 3 };
  return statusOrder[titularStatus] < statusOrder[convidadoStatus] ? titularStatus : convidadoStatus;
}

export function useVIPCounters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: vipQueryKeys.counters,
    queryFn: async (): Promise<VIPCounter[]> => {
      if (!user) return [];

      // Get all cards with VIP active
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four_digits, cardholder_name, linked_program, vip_quota_titular, vip_quota_convidado, vip_active')
        .eq('user_id', user.id)
        .eq('vip_active', true);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      // Get all VIP entries for the current year
      const now = new Date();
      const { data: entries, error: entriesError } = await supabase
        .from('vip_entries')
        .select('card_id, access_date, relationship')
        .eq('user_id', user.id)
        .gte('access_date', startOfYear(now).toISOString())
        .lte('access_date', endOfYear(now).toISOString());

      if (entriesError) throw entriesError;

      // Calculate counters for each card
      const counters: VIPCounter[] = cards.map((card) => {
        const cardEntries = entries?.filter(e => e.card_id === card.id) || [];
        
        // Count entries by relationship
        const titularEntries = cardEntries.filter(e => e.relationship === 'titular');
        const convidadoEntries = cardEntries.filter(e => e.relationship === 'convidado');
        
        const titularUsed = titularEntries.length;
        const convidadoUsed = convidadoEntries.length;
        
        // Calculate status for each type
        const titularResult = calculateStatus(card.vip_quota_titular, titularUsed);
        const convidadoResult = calculateStatus(card.vip_quota_convidado, convidadoUsed);
        
        const overallStatus = getOverallStatus(titularResult.status, convidadoResult.status);

        // Last 3 months history by relationship
        const lastThreeMonths: { month: string; titular: number; convidado: number }[] = [];
        for (let i = 2; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthTitular = titularEntries.filter(e => {
            const date = new Date(e.access_date);
            return date >= monthStart && date <= monthEnd;
          }).length;
          
          const monthConvidado = convidadoEntries.filter(e => {
            const date = new Date(e.access_date);
            return date >= monthStart && date <= monthEnd;
          }).length;
          
          lastThreeMonths.push({
            month: format(monthDate, 'MMM'),
            titular: monthTitular,
            convidado: monthConvidado,
          });
        }

        return {
          cardId: card.id,
          cardName: card.card_name,
          lastFourDigits: card.last_four_digits,
          holderName: card.cardholder_name,
          linkedProgram: card.linked_program,
          
          titularQuota: card.vip_quota_titular,
          titularUsed,
          titularRemaining: titularResult.remaining,
          titularStatus: titularResult.status,
          isTitularUnlimited: titularResult.isUnlimited,
          
          convidadoQuota: card.vip_quota_convidado,
          convidadoUsed,
          convidadoRemaining: convidadoResult.remaining,
          convidadoStatus: convidadoResult.status,
          isConvidadoUnlimited: convidadoResult.isUnlimited,
          
          overallStatus,
          lastThreeMonths,
        };
      });

      // Sort: critical first, then warning, then safe/unlimited
      const statusOrder = { critical: 0, warning: 1, safe: 2, unlimited: 3 };
      return counters.sort((a, b) => {
        const orderDiff = statusOrder[a.overallStatus] - statusOrder[b.overallStatus];
        if (orderDiff !== 0) return orderDiff;
        // If same status, sort by worst remaining
        const aWorst = a.titularRemaining === 'unlimited' ? Infinity : 
                       a.convidadoRemaining === 'unlimited' ? a.titularRemaining as number :
                       Math.min(a.titularRemaining as number, a.convidadoRemaining as number);
        const bWorst = b.titularRemaining === 'unlimited' ? Infinity : 
                       b.convidadoRemaining === 'unlimited' ? b.titularRemaining as number :
                       Math.min(b.titularRemaining as number, b.convidadoRemaining as number);
        return aWorst - bWorst;
      });
    },
    enabled: !!user,
  });
}

export function useCriticalCardsCount() {
  const { data: counters } = useVIPCounters();
  return counters?.filter(c => c.overallStatus === 'critical').length || 0;
}

export function useUnlimitedCardsCount() {
  const { data: counters } = useVIPCounters();
  // Count cards where BOTH titular and convidado are unlimited
  return counters?.filter(c => c.isTitularUnlimited && c.isConvidadoUnlimited).length || 0;
}

export function useVIPCardsWithQuota() {
  const { user } = useAuth();

  return useQuery({
    queryKey: vipQueryKeys.cardsWithQuota,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four_digits, cardholder_name, linked_program, vip_quota_titular, vip_quota_convidado, vip_active')
        .eq('user_id', user.id)
        .eq('vip_active', true)
        .order('card_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
  });
}

// Hook to get VIP status for all cards (for the Cartoes.tsx listing)
export function useAllCardsVIPStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: vipQueryKeys.allCardsStatus,
    queryFn: async () => {
      if (!user) return new Map<string, { 
        isTitularUnlimited: boolean; 
        isConvidadoUnlimited: boolean;
        titularRemaining: number | 'unlimited'; 
        convidadoRemaining: number | 'unlimited';
        titularStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
        convidadoStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
        overallStatus: 'safe' | 'warning' | 'critical' | 'unlimited' | 'inactive';
      }>();

      // Get all cards
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('id, vip_quota_titular, vip_quota_convidado, vip_active')
        .eq('user_id', user.id);

      if (cardsError) throw cardsError;
      if (!cards) return new Map();

      // Get annual entries count per card by relationship
      const now = new Date();
      const { data: entries, error: entriesError } = await supabase
        .from('vip_entries')
        .select('card_id, relationship')
        .eq('user_id', user.id)
        .gte('access_date', startOfYear(now).toISOString())
        .lte('access_date', endOfYear(now).toISOString());

      if (entriesError) throw entriesError;

      // Count entries per card by relationship
      const entriesCount = new Map<string, { titular: number; convidado: number }>();
      entries?.forEach(e => {
        const current = entriesCount.get(e.card_id) || { titular: 0, convidado: 0 };
        if (e.relationship === 'titular') {
          current.titular++;
        } else {
          current.convidado++;
        }
        entriesCount.set(e.card_id, current);
      });

      // Build status map
      const statusMap = new Map<string, { 
        isTitularUnlimited: boolean; 
        isConvidadoUnlimited: boolean;
        titularRemaining: number | 'unlimited'; 
        convidadoRemaining: number | 'unlimited';
        titularStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
        convidadoStatus: 'safe' | 'warning' | 'critical' | 'unlimited';
        overallStatus: 'safe' | 'warning' | 'critical' | 'unlimited' | 'inactive';
      }>();
      
      cards.forEach(card => {
        if (!card.vip_active) {
          statusMap.set(card.id, { 
            isTitularUnlimited: false,
            isConvidadoUnlimited: false,
            titularRemaining: 0, 
            convidadoRemaining: 0,
            titularStatus: 'safe',
            convidadoStatus: 'safe',
            overallStatus: 'inactive' 
          });
          return;
        }

        const counts = entriesCount.get(card.id) || { titular: 0, convidado: 0 };
        
        const titularResult = calculateStatus(card.vip_quota_titular, counts.titular);
        const convidadoResult = calculateStatus(card.vip_quota_convidado, counts.convidado);
        const overallStatus = getOverallStatus(titularResult.status, convidadoResult.status);

        statusMap.set(card.id, { 
          isTitularUnlimited: titularResult.isUnlimited,
          isConvidadoUnlimited: convidadoResult.isUnlimited,
          titularRemaining: titularResult.remaining, 
          convidadoRemaining: convidadoResult.remaining,
          titularStatus: titularResult.status,
          convidadoStatus: convidadoResult.status,
          overallStatus,
        });
      });

      return statusMap;
    },
    enabled: !!user,
  });
}
