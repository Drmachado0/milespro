import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavingsItem {
  id: string;
  type: 'ticket' | 'hotel' | 'car' | 'cruise' | 'insurance' | 'attraction' | 'transfer';
  description: string;
  date: string;
  total_cost_brl: number;
  cash_price: number;
  savings: number;
  savingsPercentage: number;
  status: string;
  holder_id?: string | null;
  holder_name?: string | null;
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

export interface MonthlySavings {
  month: string;
  totalCost: number;
  cashPrice: number;
  savings: number;
}

export function useTotalSavings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['total-savings', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
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
          } as SavingsByCategory,
          allReservations: [] as SavingsItem[],
          monthlySavings: [] as MonthlySavings[],
        };
      }

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

      // Fetch tickets
      const { data: tickets } = await supabase
        .from('travel_tickets')
        .select('id, origin, destination, flight_date, total_cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

      if (tickets) {
        tickets.forEach((t) => {
          const cashPrice = t.cash_price || 0;
          const savings = cashPrice - t.total_cost_brl;
          const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;
          savingsByCategory.tickets += savings;
          allReservations.push({
            id: t.id,
            type: 'ticket',
            description: `${t.origin} → ${t.destination}${t.holder_name ? ` (${t.holder_name})` : ''}`,
            date: t.flight_date,
            total_cost_brl: t.total_cost_brl,
            cash_price: cashPrice,
            savings,
            savingsPercentage,
            status: t.status,
            holder_id: t.holder_id,
            holder_name: t.holder_name,
          });
        });
      }

      // Fetch hotels
      const { data: hotels } = await supabase
        .from('travel_hotel_reservations')
        .select('id, hotel_name, city, check_in, total_cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

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
          });
        });
      }

      // Fetch cars
      const { data: cars } = await supabase
        .from('travel_car_rentals')
        .select('id, rental_company, pickup_location, pickup_date, total_cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

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
          });
        });
      }

      // Fetch cruises
      const { data: cruises } = await supabase
        .from('travel_cruises')
        .select('id, cruise_line, ship_name, departure_date, total_cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

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
          });
        });
      }

      // Fetch insurances - uses miles accumulation model (not redemption)
      const { data: insurances } = await supabase
        .from('travel_insurances')
        .select('id, insurance_company, plan_name, start_date, cost_brl, status, miles_earned, miles_program, mile_value_per_thousand, holder_id, holder_name')
        .eq('user_id', user.id);

      if (insurances) {
        insurances.forEach((i) => {
          const costBrl = i.cost_brl || 0;
          const milesEarned = i.miles_earned || 0;
          const mileValuePerK = i.mile_value_per_thousand || 35;
          
          // Economia = valor das milhas geradas (modelo de acúmulo)
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
            cash_price: costBrl + milesValue, // Para consistência visual
            savings,
            savingsPercentage,
            status: i.status,
            holder_id: i.holder_id,
            holder_name: i.holder_name,
          });
        });
      }

      // Fetch attractions
      const { data: attractions } = await supabase
        .from('travel_attractions')
        .select('id, attraction_name, city, activity_date, cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

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
          });
        });
      }

      // Fetch transfers
      const { data: transfers } = await supabase
        .from('travel_transfers')
        .select('id, transfer_type, origin, destination, transfer_date, cost_brl, cash_price, status, holder_id, holder_name')
        .eq('user_id', user.id);

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
          });
        });
      }

      // Sort by date descending
      allReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totalSavings = Object.values(savingsByCategory).reduce((a, b) => a + b, 0);
      const totalCost = allReservations.reduce((sum, r) => sum + r.total_cost_brl, 0);
      const totalCashPrice = allReservations.reduce((sum, r) => sum + r.cash_price, 0);

      // Calculate monthly savings for chart
      const monthlyMap = new Map<string, MonthlySavings>();
      allReservations.forEach((r) => {
        const monthKey = r.date.substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(monthKey) || { month: monthKey, totalCost: 0, cashPrice: 0, savings: 0 };
        existing.totalCost += r.total_cost_brl;
        existing.cashPrice += r.cash_price;
        existing.savings += r.savings;
        monthlyMap.set(monthKey, existing);
      });

      const monthlySavings = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalSavings,
        totalCost,
        totalCashPrice,
        reservationsCount: allReservations.length,
        savingsByCategory,
        allReservations,
        monthlySavings,
      };
    },
    enabled: !!user?.id,
  });
}
