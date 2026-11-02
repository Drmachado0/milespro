import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import {
  cancelTravelBooking,
  createTravelBooking,
  updateTravelBooking,
} from './travelMutationGateway';

describe('travel mutation RPC boundary', () => {
  beforeEach(() => rpc.mockReset());

  it('updates a booking and its financial side effects in one RPC call', async () => {
    rpc.mockResolvedValue({ data: { id: 'booking-1', miles_used: 42000 }, error: null });

    await expect(updateTravelBooking('ticket', 'booking-1', { miles_used: 42000 })).resolves.toEqual({
      id: 'booking-1',
      miles_used: 42000,
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('update_travel_booking', {
      p_booking_type: 'ticket',
      p_booking_id: 'booking-1',
      p_updates: { miles_used: 42000 },
    });
  });

  it('creates a booking and its financial side effects in one RPC call', async () => {
    const booking = { client_id: 'client-1', miles_used: 12000 };
    rpc.mockResolvedValue({ data: { id: 'booking-new', ...booking }, error: null });

    await expect(createTravelBooking('cruise', booking)).resolves.toMatchObject({ id: 'booking-new' });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('create_travel_booking', {
      p_booking_type: 'cruise',
      p_booking: booking,
    });
  });

  it('cancels a booking and refunds balances in one RPC call', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(cancelTravelBooking('car', 'booking-2')).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('cancel_travel_booking', {
      p_booking_type: 'car',
      p_booking_id: 'booking-2',
    });
  });

  it('surfaces RPC failures without attempting client-side compensation', async () => {
    const error = new Error('transaction aborted');
    rpc.mockResolvedValue({ data: null, error });

    await expect(cancelTravelBooking('hotel', 'booking-3')).rejects.toBe(error);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
