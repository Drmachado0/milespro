import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useTravelAgencyStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-agency-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [clients, tickets, hotels, cars] = await Promise.all([
        supabase.from('travel_clients').select('miles_balance, total_miles_used, total_spent_brl').eq('user_id', user.id),
        supabase.from('travel_tickets').select('miles_used, tax_brl, total_cost_brl').eq('user_id', user.id),
        supabase.from('travel_hotel_reservations').select('miles_used, tax_brl, total_cost_brl').eq('user_id', user.id),
        supabase.from('travel_car_rentals').select('miles_used, tax_brl, total_cost_brl').eq('user_id', user.id),
      ]);

      const totalClients = clients.data?.length || 0;
      const totalMilesAvailable = clients.data?.reduce((sum, c) => sum + (c.miles_balance || 0), 0) || 0;
      const totalMilesUsed = [
        ...(tickets.data || []),
        ...(hotels.data || []),
        ...(cars.data || []),
      ].reduce((sum, item) => sum + (item.miles_used || 0), 0);
      
      const totalRevenue = [
        ...(tickets.data || []),
        ...(hotels.data || []),
        ...(cars.data || []),
      ].reduce((sum, item) => sum + (item.total_cost_brl || 0), 0);

      return {
        totalClients,
        totalMilesAvailable,
        totalMilesUsed,
        totalRevenue,
        ticketsCount: tickets.data?.length || 0,
        hotelsCount: hotels.data?.length || 0,
        carsCount: cars.data?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}
