import { supabase } from '@/integrations/supabase/client';

export type TravelBookingType = 'ticket' | 'hotel' | 'car' | 'cruise';
type ImmutableBookingField = 'id' | 'user_id' | 'created_at' | 'updated_at' | 'client';
export type TravelBookingPatch<T> = Omit<Partial<T>, ImmutableBookingField | 'client_id'>;
export type TravelBookingCreate<T> = Omit<T, ImmutableBookingField>;

export async function createTravelBooking<T>(
  bookingType: TravelBookingType,
  booking: TravelBookingCreate<T>,
): Promise<T> {
  const { data, error } = await supabase.rpc('create_travel_booking' as never, {
    p_booking_type: bookingType,
    p_booking: booking,
  } as never);

  if (error) throw error;
  return data as T;
}

export async function updateTravelBooking<T>(
  bookingType: TravelBookingType,
  bookingId: string,
  updates: TravelBookingPatch<T>,
): Promise<T> {
  const { data, error } = await supabase.rpc('update_travel_booking' as never, {
    p_booking_type: bookingType,
    p_booking_id: bookingId,
    p_updates: updates,
  } as never);

  if (error) throw error;
  return data as T;
}

export async function cancelTravelBooking(
  bookingType: TravelBookingType,
  bookingId: string,
): Promise<void> {
  const { error } = await supabase.rpc('cancel_travel_booking' as never, {
    p_booking_type: bookingType,
    p_booking_id: bookingId,
  } as never);

  if (error) throw error;
}
