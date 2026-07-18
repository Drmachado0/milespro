-- Restore table-level privileges required before RLS policies are evaluated.
-- These GRANTs do not weaken row isolation: authenticated users still pass
-- through each table's RLS policies, while service_role keeps its backend/admin
-- access for test fixtures and edge-function maintenance paths.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.travel_clients,
  public.travel_cruises,
  public.travel_attractions,
  public.travel_car_rentals,
  public.travel_hotel_reservations,
  public.travel_insurances,
  public.travel_quotes,
  public.travel_receivables,
  public.travel_tickets,
  public.travel_transfers,
  public.managed_accounts,
  public.push_subscriptions
TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.user_promo_alerts TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.travel_clients,
  public.travel_cruises,
  public.travel_attractions,
  public.travel_car_rentals,
  public.travel_hotel_reservations,
  public.travel_insurances,
  public.travel_quotes,
  public.travel_receivables,
  public.travel_tickets,
  public.travel_transfers,
  public.managed_accounts,
  public.user_promo_alerts,
  public.push_subscriptions
TO service_role;

COMMIT;
