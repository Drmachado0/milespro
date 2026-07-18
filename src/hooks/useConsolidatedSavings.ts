import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';

export type SavingsCategory = 'ticket' | 'hotel' | 'car' | 'cruise' | 'insurance' | 'attraction' | 'transfer';

export interface SavingsItem {
  id: string;
  type: SavingsCategory;
  description: string;
  date: string;
  total_cost_brl: number;
  cash_price: number;
  savings: number;
  savingsPercentage: number;
  status: string;
  holder_id?: string | null;
  holder_name?: string | null;
  program?: string | null;
}

export interface SavingsByCategory {
  tickets: number;
  hotels: number;
  cars: number;
  cruises: number;
  insurances: number;
  attractions: number;
  transfers: number;
}

export interface MonthlySavingsData {
  month: string;
  monthLabel: string;
  totalCost: number;
  cashPrice: number;
  savings: number;
  byCategory: SavingsByCategory;
}

export interface SavingsByProgram {
  program: string;
  savings: number;
  reservationsCount: number;
}

export interface SavingsByHolder {
  holder_id: string;
  holder_name: string;
  savings: number;
  reservationsCount: number;
}

export interface ConsolidatedSavingsFilters {
  startDate?: string;
  endDate?: string;
  holderId?: string;
  programId?: string;
  category?: SavingsCategory | 'all';
}

export interface ConsolidatedSavingsResult {
  totalSavings: number;
  totalCost: number;
  totalCashPrice: number;
  reservationsCount: number;
  savingsByCategory: SavingsByCategory;
  savingsByProgram: SavingsByProgram[];
  savingsByHolder: SavingsByHolder[];
  monthlyTrend: MonthlySavingsData[];
  reservations: SavingsItem[];
}

interface DateFilterQuery<TQuery> {
  gte: (column: string, value: string) => TQuery;
  lte: (column: string, value: string) => TQuery;
}

interface EqualityFilterQuery<TQuery> {
  eq: (column: string, value: string) => TQuery;
}

const DEFAULT_RESULT: ConsolidatedSavingsResult = {
  totalSavings: 0,
  totalCost: 0,
  totalCashPrice: 0,
  reservationsCount: 0,
  savingsByCategory: {
    tickets: 0,
    hotels: 0,
    cars: 0,
    cruises: 0,
    insurances: 0,
    attractions: 0,
    transfers: 0,
  },
  savingsByProgram: [],
  savingsByHolder: [],
  monthlyTrend: [],
  reservations: [],
};

export function useConsolidatedSavings(filters: ConsolidatedSavingsFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['consolidated-savings', user?.id, filters],
    queryFn: async (): Promise<ConsolidatedSavingsResult> => {
      if (!user?.id) return DEFAULT_RESULT;

      const allReservations: SavingsItem[] = [];
      const savingsByCategory: SavingsByCategory = {
        tickets: 0,
        hotels: 0,
        cars: 0,
        cruises: 0,
        insurances: 0,
        attractions: 0,
        transfers: 0,
      };

      // Build date filter queries
      const applyDateFilter = <TQuery extends DateFilterQuery<TQuery>>(query: TQuery, dateField: string): TQuery => {
        let filteredQuery = query;
        if (filters.startDate) filteredQuery = filteredQuery.gte(dateField, filters.startDate);
        if (filters.endDate) filteredQuery = filteredQuery.lte(dateField, filters.endDate);
        return filteredQuery;
      };

      const applyHolderFilter = <TQuery extends EqualityFilterQuery<TQuery>>(query: TQuery): TQuery => {
        if (filters.holderId && filters.holderId !== 'all') {
          return query.eq('holder_id', filters.holderId);
        }
        return query;
      };

      const applyProgramFilter = <TQuery extends EqualityFilterQuery<TQuery>>(query: TQuery, programField: string = 'miles_program'): TQuery => {
        if (filters.programId && filters.programId !== 'all') {
          return query.eq(programField, filters.programId);
        }
        return query;
      };

      // Fetch all categories in parallel
      const shouldFetchCategory = (cat: SavingsCategory) =>
        !filters.category || filters.category === 'all' || filters.category === cat;

      const fetchPromises: Promise<void>[] = [];

      // Tickets
      if (shouldFetchCategory('ticket')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_tickets')
              .select('id, origin, destination, flight_date, total_cost_brl, cash_price, status, holder_id, holder_name, miles_program')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'flight_date');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: tickets } = await query;
            if (tickets) {
              tickets.forEach((t) => {
                const cashPrice = t.cash_price || 0;
                const savings = cashPrice - t.total_cost_brl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.tickets += savings;
                allReservations.push({
                  id: t.id,
                  type: 'ticket',
                  description: `${t.origin} → ${t.destination}`,
                  date: t.flight_date,
                  total_cost_brl: t.total_cost_brl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: t.status,
                  holder_id: t.holder_id,
                  holder_name: t.holder_name,
                  program: t.miles_program,
                });
              });
            }
          })()
        );
      }

      // Hotels
      if (shouldFetchCategory('hotel')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_hotel_reservations')
              .select('id, hotel_name, city, check_in, total_cost_brl, cash_price, status, holder_id, holder_name, miles_program')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'check_in');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: hotels } = await query;
            if (hotels) {
              hotels.forEach((h) => {
                const cashPrice = h.cash_price || 0;
                const savings = cashPrice - h.total_cost_brl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.hotels += savings;
                allReservations.push({
                  id: h.id,
                  type: 'hotel',
                  description: `${h.hotel_name} - ${h.city}`,
                  date: h.check_in,
                  total_cost_brl: h.total_cost_brl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: h.status,
                  holder_id: h.holder_id,
                  holder_name: h.holder_name,
                  program: h.miles_program,
                });
              });
            }
          })()
        );
      }

      // Cars
      if (shouldFetchCategory('car')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_car_rentals')
              .select('id, rental_company, pickup_location, pickup_date, total_cost_brl, cash_price, status, holder_id, holder_name, miles_program')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'pickup_date');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: cars } = await query;
            if (cars) {
              cars.forEach((c) => {
                const cashPrice = c.cash_price || 0;
                const savings = cashPrice - c.total_cost_brl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.cars += savings;
                allReservations.push({
                  id: c.id,
                  type: 'car',
                  description: `${c.rental_company} - ${c.pickup_location}`,
                  date: c.pickup_date,
                  total_cost_brl: c.total_cost_brl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: c.status,
                  holder_id: c.holder_id,
                  holder_name: c.holder_name,
                  program: c.miles_program,
                });
              });
            }
          })()
        );
      }

      // Cruises
      if (shouldFetchCategory('cruise')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_cruises')
              .select('id, cruise_line, ship_name, departure_date, total_cost_brl, cash_price, status, holder_id, holder_name, miles_program')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'departure_date');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: cruises } = await query;
            if (cruises) {
              cruises.forEach((cr) => {
                const cashPrice = cr.cash_price || 0;
                const savings = cashPrice - cr.total_cost_brl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.cruises += savings;
                allReservations.push({
                  id: cr.id,
                  type: 'cruise',
                  description: `${cr.cruise_line} - ${cr.ship_name}`,
                  date: cr.departure_date,
                  total_cost_brl: cr.total_cost_brl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: cr.status,
                  holder_id: cr.holder_id,
                  holder_name: cr.holder_name,
                  program: cr.miles_program,
                });
              });
            }
          })()
        );
      }

      // Insurances
      if (shouldFetchCategory('insurance')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_insurances')
              .select('id, insurance_company, plan_name, start_date, cost_brl, status, miles_earned, miles_program, mile_value_per_thousand, holder_id, holder_name')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'start_date');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: insurances } = await query;
            if (insurances) {
              insurances.forEach((i) => {
                const costBrl = i.cost_brl || 0;
                const milesEarned = i.miles_earned || 0;
                const mileValuePerK = i.mile_value_per_thousand || 35;
                const milesValue = (milesEarned / 1000) * mileValuePerK;
                const savings = milesValue;
                const savingsPercentage = costBrl > 0 ? (savings / costBrl) * 100 : 0;

                savingsByCategory.insurances += savings;
                allReservations.push({
                  id: i.id,
                  type: 'insurance',
                  description: `${i.insurance_company} - ${i.plan_name}`,
                  date: i.start_date,
                  total_cost_brl: costBrl,
                  cash_price: costBrl + milesValue,
                  savings,
                  savingsPercentage,
                  status: i.status,
                  holder_id: i.holder_id,
                  holder_name: i.holder_name,
                  program: i.miles_program,
                });
              });
            }
          })()
        );
      }

      // Attractions
      if (shouldFetchCategory('attraction')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_attractions')
              .select('id, attraction_name, city, activity_date, cost_brl, cash_price, status, holder_id, holder_name')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'activity_date');
            query = applyHolderFilter(query);

            const { data: attractions } = await query;
            if (attractions) {
              attractions.forEach((a) => {
                const cashPrice = a.cash_price || 0;
                const costBrl = a.cost_brl || 0;
                const savings = cashPrice - costBrl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.attractions += savings;
                allReservations.push({
                  id: a.id,
                  type: 'attraction',
                  description: `${a.attraction_name} - ${a.city}`,
                  date: a.activity_date,
                  total_cost_brl: costBrl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: a.status,
                  holder_id: a.holder_id,
                  holder_name: a.holder_name,
                  program: null,
                });
              });
            }
          })()
        );
      }

      // Transfers
      if (shouldFetchCategory('transfer')) {
        fetchPromises.push(
          (async () => {
            let query = supabase
              .from('travel_transfers')
              .select('id, transfer_type, origin, destination, transfer_date, cost_brl, cash_price, status, holder_id, holder_name, miles_program')
              .eq('user_id', user.id);
            query = applyDateFilter(query, 'transfer_date');
            query = applyHolderFilter(query);
            query = applyProgramFilter(query);

            const { data: transfers } = await query;
            if (transfers) {
              transfers.forEach((tr) => {
                const cashPrice = tr.cash_price || 0;
                const costBrl = tr.cost_brl || 0;
                const savings = cashPrice - costBrl;
                const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
                savingsByCategory.transfers += savings;
                allReservations.push({
                  id: tr.id,
                  type: 'transfer',
                  description: `${tr.transfer_type}: ${tr.origin} → ${tr.destination}`,
                  date: tr.transfer_date,
                  total_cost_brl: costBrl,
                  cash_price: cashPrice,
                  savings,
                  savingsPercentage,
                  status: tr.status,
                  holder_id: tr.holder_id,
                  holder_name: tr.holder_name,
                  program: tr.miles_program,
                });
              });
            }
          })()
        );
      }

      await Promise.all(fetchPromises);

      // Sort by date descending
      allReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totalSavings = Object.values(savingsByCategory).reduce((a, b) => a + b, 0);
      const totalCost = allReservations.reduce((sum, r) => sum + r.total_cost_brl, 0);
      const totalCashPrice = allReservations.reduce((sum, r) => sum + r.cash_price, 0);

      // Calculate savings by program
      const programMap = new Map<string, SavingsByProgram>();
      allReservations.forEach((r) => {
        const program = r.program || 'Sem programa';
        const existing = programMap.get(program) || { program, savings: 0, reservationsCount: 0 };
        existing.savings += r.savings;
        existing.reservationsCount += 1;
        programMap.set(program, existing);
      });
      const savingsByProgram = Array.from(programMap.values()).sort((a, b) => b.savings - a.savings);

      // Calculate savings by holder
      const holderMap = new Map<string, SavingsByHolder>();
      allReservations.forEach((r) => {
        const holderId = r.holder_id || 'unknown';
        const holderName = r.holder_name || 'Sem titular';
        const existing = holderMap.get(holderId) || { holder_id: holderId, holder_name: holderName, savings: 0, reservationsCount: 0 };
        existing.savings += r.savings;
        existing.reservationsCount += 1;
        holderMap.set(holderId, existing);
      });
      const savingsByHolder = Array.from(holderMap.values()).sort((a, b) => b.savings - a.savings);

      // Calculate monthly trend
      const monthlyMap = new Map<string, MonthlySavingsData>();
      allReservations.forEach((r) => {
        const monthKey = r.date.substring(0, 7);
        const existing = monthlyMap.get(monthKey) || {
          month: monthKey,
          monthLabel: format(parseISO(`${monthKey}-01`), 'MMM/yy'),
          totalCost: 0,
          cashPrice: 0,
          savings: 0,
          byCategory: { tickets: 0, hotels: 0, cars: 0, cruises: 0, insurances: 0, attractions: 0, transfers: 0 },
        };
        existing.totalCost += r.total_cost_brl;
        existing.cashPrice += r.cash_price;
        existing.savings += r.savings;

        // Add to category
        const categoryKey = `${r.type}s` as keyof SavingsByCategory;
        if (categoryKey in existing.byCategory) {
          existing.byCategory[categoryKey] += r.savings;
        }

        monthlyMap.set(monthKey, existing);
      });
      const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalSavings,
        totalCost,
        totalCashPrice,
        reservationsCount: allReservations.length,
        savingsByCategory,
        savingsByProgram,
        savingsByHolder,
        monthlyTrend,
        reservations: allReservations,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
