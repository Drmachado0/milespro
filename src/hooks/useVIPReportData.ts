import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, parseISO, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface VIPReportFilters {
  cardId: string;
  startDate: string;
  endDate: string;
}

export interface VIPEntriesReportRow {
  date: string;
  cardName: string;
  personName: string;
  relationship: string;
  location: string;
  notes: string;
}

export interface VIPByCardReportRow {
  cardName: string;
  titularEntries: number;
  guestEntries: number;
  totalEntries: number;
  quotaTitular: number;
  quotaConvidado: number;
  usageTitular: string;
  usageConvidado: string;
}

export interface VIPByLocationReportRow {
  location: string;
  titularEntries: number;
  guestEntries: number;
  totalEntries: number;
  percentage: number;
}

export interface VIPByMonthReportRow {
  month: string;
  titularEntries: number;
  guestEntries: number;
  totalEntries: number;
}

interface VIPEntry {
  id: string;
  card_id: string;
  person_name: string;
  relationship: 'titular' | 'convidado';
  location: string;
  access_date: string;
  notes: string | null;
  credit_cards?: {
    card_name: string;
    vip_quota_titular: number | null;
    vip_quota_convidado: number | null;
    last_four_digits: string | null;
  };
}

export function useVIPReportData(filters: VIPReportFilters) {
  const { user } = useAuth();

  // Fetch VIP entries with card info
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['vip-report-entries', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('vip_entries')
        .select(`
          *,
          credit_cards (
            card_name,
            vip_quota_titular,
            vip_quota_convidado,
            last_four_digits
          )
        `)
        .eq('user_id', user.id)
        .order('access_date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('access_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('access_date', `${filters.endDate}T23:59:59`);
      }
      if (filters.cardId && filters.cardId !== 'all') {
        query = query.eq('card_id', filters.cardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VIPEntry[];
    },
    enabled: !!user?.id,
  });

  // Fetch cards with VIP quota for filter dropdown
  const { data: cards = [] } = useQuery({
    queryKey: ['vip-report-cards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four_digits, vip_quota_titular, vip_quota_convidado')
        .eq('user_id', user.id)
        .eq('vip_active', true)
        .order('card_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Process entries report (detailed list)
  const entriesReport = useMemo<VIPEntriesReportRow[]>(() => {
    return entries.map((entry) => ({
      date: format(parseISO(entry.access_date), 'dd/MM/yyyy'),
      cardName: entry.credit_cards?.card_name 
        ? `${entry.credit_cards.card_name}${entry.credit_cards.last_four_digits ? ` (****${entry.credit_cards.last_four_digits})` : ''}`
        : 'Cartão não encontrado',
      personName: entry.person_name,
      relationship: entry.relationship === 'titular' ? 'Titular' : 'Convidado',
      location: entry.location,
      notes: entry.notes || '-',
    }));
  }, [entries]);

  // Process by card report
  const byCardReport = useMemo<VIPByCardReportRow[]>(() => {
    const cardMap = new Map<string, {
      cardName: string;
      titularEntries: number;
      guestEntries: number;
      quotaTitular: number;
      quotaConvidado: number;
    }>();

    entries.forEach((entry) => {
      const cardId = entry.card_id;
      const current = cardMap.get(cardId) || {
        cardName: entry.credit_cards?.card_name 
          ? `${entry.credit_cards.card_name}${entry.credit_cards.last_four_digits ? ` (****${entry.credit_cards.last_four_digits})` : ''}`
          : 'Cartão não encontrado',
        titularEntries: 0,
        guestEntries: 0,
        quotaTitular: entry.credit_cards?.vip_quota_titular || 0,
        quotaConvidado: entry.credit_cards?.vip_quota_convidado || 0,
      };

      if (entry.relationship === 'titular') {
        current.titularEntries += 1;
      } else {
        current.guestEntries += 1;
      }

      cardMap.set(cardId, current);
    });

    const result: VIPByCardReportRow[] = [];
    cardMap.forEach((data) => {
      const usageTitular = data.quotaTitular === 0 
        ? 'Ilimitado' 
        : `${data.titularEntries}/${data.quotaTitular}`;
      const usageConvidado = data.quotaConvidado === 0 
        ? 'Ilimitado' 
        : `${data.guestEntries}/${data.quotaConvidado}`;

      result.push({
        cardName: data.cardName,
        titularEntries: data.titularEntries,
        guestEntries: data.guestEntries,
        totalEntries: data.titularEntries + data.guestEntries,
        quotaTitular: data.quotaTitular,
        quotaConvidado: data.quotaConvidado,
        usageTitular,
        usageConvidado,
      });
    });

    return result.sort((a, b) => b.totalEntries - a.totalEntries);
  }, [entries]);

  // Process by location report
  const byLocationReport = useMemo<VIPByLocationReportRow[]>(() => {
    const locationMap = new Map<string, {
      titularEntries: number;
      guestEntries: number;
    }>();

    entries.forEach((entry) => {
      const location = entry.location;
      const current = locationMap.get(location) || {
        titularEntries: 0,
        guestEntries: 0,
      };

      if (entry.relationship === 'titular') {
        current.titularEntries += 1;
      } else {
        current.guestEntries += 1;
      }

      locationMap.set(location, current);
    });

    const totalEntries = entries.length;
    const result: VIPByLocationReportRow[] = [];

    locationMap.forEach((data, location) => {
      const total = data.titularEntries + data.guestEntries;
      result.push({
        location,
        titularEntries: data.titularEntries,
        guestEntries: data.guestEntries,
        totalEntries: total,
        percentage: totalEntries > 0 ? Number(((total / totalEntries) * 100).toFixed(1)) : 0,
      });
    });

    return result.sort((a, b) => b.totalEntries - a.totalEntries);
  }, [entries]);

  // Process by month report
  const byMonthReport = useMemo<VIPByMonthReportRow[]>(() => {
    const monthMap = new Map<string, {
      titularEntries: number;
      guestEntries: number;
    }>();

    entries.forEach((entry) => {
      const monthKey = format(parseISO(entry.access_date), 'yyyy-MM');
      const current = monthMap.get(monthKey) || {
        titularEntries: 0,
        guestEntries: 0,
      };

      if (entry.relationship === 'titular') {
        current.titularEntries += 1;
      } else {
        current.guestEntries += 1;
      }

      monthMap.set(monthKey, current);
    });

    const result: VIPByMonthReportRow[] = [];
    monthMap.forEach((data, monthKey) => {
      result.push({
        month: format(parseISO(`${monthKey}-01`), 'MMM/yyyy', { locale: ptBR }),
        titularEntries: data.titularEntries,
        guestEntries: data.guestEntries,
        totalEntries: data.titularEntries + data.guestEntries,
      });
    });

    return result.sort((a, b) => b.month.localeCompare(a.month));
  }, [entries]);

  // Summary stats
  const summary = useMemo(() => {
    const totalEntries = entries.length;
    const titularEntries = entries.filter(e => e.relationship === 'titular').length;
    const guestEntries = entries.filter(e => e.relationship === 'convidado').length;
    const uniqueLocations = new Set(entries.map(e => e.location)).size;
    const uniqueCards = new Set(entries.map(e => e.card_id)).size;
    const uniqueGuests = new Set(
      entries.filter(e => e.relationship === 'convidado').map(e => e.person_name)
    ).size;

    return {
      totalEntries,
      titularEntries,
      guestEntries,
      uniqueLocations,
      uniqueCards,
      uniqueGuests,
    };
  }, [entries]);

  return {
    entriesReport,
    byCardReport,
    byLocationReport,
    byMonthReport,
    summary,
    cards,
    isLoading,
  };
}
