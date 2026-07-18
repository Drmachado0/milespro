import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';
import { encrypt, decrypt, looksEncrypted } from '../_shared/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

const reservationTypeSchema = z.enum([
  'ticket', 'hotel', 'car', 'cruise', 'insurance', 'attraction', 'transfer',
]);

// `sync_all` has no body fields; per-reservation actions require type + id.
const syncSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync_all') }),
  z.object({
    action: z.enum(['sync', 'delete', 'create', 'update']),
    reservation_type: reservationTypeSchema,
    reservation_id: z.string().uuid(),
  }),
]);

// Color IDs for different reservation types
const COLOR_IDS: Record<string, string> = {
  ticket: '1',      // Blue
  hotel: '3',       // Purple
  car: '6',         // Orange
  cruise: '7',      // Turquoise
  insurance: '10',  // Green
  attraction: '4',  // Pink
  transfer: '5',    // Yellow
};

interface CalendarEvent {
  summary: string;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId: string;
  location?: string;
}

async function decryptToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  if (!looksEncrypted(token)) return token; // Plaintext, return as-is
  return decrypt(token, ENCRYPTION_KEY);
}

async function encryptToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  return encrypt(token, ENCRYPTION_KEY);
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: integration } = await supabase
    .from('google_calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!integration || !integration.enabled) {
    return null;
  }

  // Decrypt access token
  const accessToken = await decryptToken(integration.access_token);
  if (!accessToken) return null;

  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return accessToken;
  }

  // Need to refresh token - decrypt refresh token first
  const refreshToken = await decryptToken(integration.refresh_token);
  if (!refreshToken) {
    console.error('Failed to decrypt refresh token');
    return null;
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await refreshResponse.json();

  if (tokens.error) {
    console.error('Token refresh failed:', tokens);
    return null;
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Encrypt new tokens before storing
  const newEncryptedAccessToken = await encryptToken(tokens.access_token);
  const newEncryptedRefreshToken = tokens.refresh_token 
    ? await encryptToken(tokens.refresh_token)
    : integration.refresh_token;

  await supabase
    .from('google_calendar_integrations')
    .update({
      access_token: newEncryptedAccessToken,
      refresh_token: newEncryptedRefreshToken,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

function formatTicketEvent(ticket: any, clientName: string): CalendarEvent {
  const origin = ticket.origin || 'Origem';
  const destination = ticket.destination || 'Destino';
  
  return {
    summary: `✈️ Voo: ${origin} → ${destination}`,
    description: `Cliente: ${clientName}\nCia Aérea: ${ticket.airline || 'N/A'}\nLocalizador: ${ticket.locator || 'N/A'}\nPassageiros: ${ticket.passengers || 1}\nMilhas: ${ticket.miles_used?.toLocaleString() || 0}\nTaxas: R$ ${ticket.tax_brl?.toFixed(2) || '0.00'}`,
    start: { date: ticket.flight_date },
    end: { date: ticket.return_date || ticket.flight_date },
    colorId: COLOR_IDS.ticket,
    location: destination,
  };
}

function formatHotelEvent(hotel: any, clientName: string): CalendarEvent {
  return {
    summary: `🏨 Hotel: ${hotel.hotel_name}`,
    description: `Cliente: ${clientName}\nCidade: ${hotel.city}\nQuartos: ${hotel.rooms || 1}\nNoites: ${hotel.nights}\nConfirmação: ${hotel.confirmation_number || 'N/A'}\nMilhas: ${hotel.miles_used?.toLocaleString() || 0}\nTaxas: R$ ${hotel.tax_brl?.toFixed(2) || '0.00'}`,
    start: { date: hotel.check_in },
    end: { date: hotel.check_out },
    colorId: COLOR_IDS.hotel,
    location: `${hotel.hotel_name}, ${hotel.city}`,
  };
}

function formatCarEvent(car: any, clientName: string): CalendarEvent {
  return {
    summary: `🚗 Carro: ${car.rental_company} - ${car.vehicle_category}`,
    description: `Cliente: ${clientName}\nRetirada: ${car.pickup_location}\nDevolução: ${car.dropoff_location}\nDias: ${car.days}\nConfirmação: ${car.confirmation_number || 'N/A'}\nMilhas: ${car.miles_used?.toLocaleString() || 0}\nTaxas: R$ ${car.tax_brl?.toFixed(2) || '0.00'}`,
    start: { date: car.pickup_date },
    end: { date: car.dropoff_date },
    colorId: COLOR_IDS.car,
    location: car.pickup_location,
  };
}

function formatCruiseEvent(cruise: any, clientName: string): CalendarEvent {
  return {
    summary: `🚢 Cruzeiro: ${cruise.cruise_line} - ${cruise.ship_name}`,
    description: `Cliente: ${clientName}\nEmbarque: ${cruise.departure_port}\nDesembarque: ${cruise.arrival_port}\nCabine: ${cruise.cabin_type}\nNoites: ${cruise.nights}\nPassageiros: ${cruise.passengers || 1}\nConfirmação: ${cruise.confirmation_number || 'N/A'}\nMilhas: ${cruise.miles_used?.toLocaleString() || 0}`,
    start: { date: cruise.departure_date },
    end: { date: cruise.return_date },
    colorId: COLOR_IDS.cruise,
    location: cruise.departure_port,
  };
}

function formatInsuranceEvent(insurance: any, clientName: string): CalendarEvent {
  return {
    summary: `🛡️ Seguro: ${insurance.insurance_company} - ${insurance.plan_name}`,
    description: `Cliente: ${clientName}\nDestino: ${insurance.destination}\nCobertura: ${insurance.coverage_type}\nValor Cobertura: R$ ${insurance.coverage_amount?.toLocaleString() || 'N/A'}\nViajantes: ${insurance.travelers || 1}\nApólice: ${insurance.policy_number || 'N/A'}`,
    start: { date: insurance.start_date },
    end: { date: insurance.end_date },
    colorId: COLOR_IDS.insurance,
    location: insurance.destination,
  };
}

function formatAttractionEvent(attraction: any, clientName: string): CalendarEvent {
  return {
    summary: `🎢 Passeio: ${attraction.attraction_name}`,
    description: `Cliente: ${clientName}\nTipo: ${attraction.attraction_type}\nCidade: ${attraction.city}, ${attraction.country}\nParticipantes: ${attraction.participants || 1}\nFornecedor: ${attraction.provider || 'N/A'}\nConfirmação: ${attraction.confirmation_number || 'N/A'}`,
    start: { date: attraction.activity_date },
    end: { date: attraction.activity_date },
    colorId: COLOR_IDS.attraction,
    location: `${attraction.city}, ${attraction.country}`,
  };
}

function formatTransferEvent(transfer: any, clientName: string): CalendarEvent {
  return {
    summary: `🚐 Transfer: ${transfer.pickup_location} → ${transfer.dropoff_location}`,
    description: `Cliente: ${clientName}\nTipo: ${transfer.vehicle_type}\nPassageiros: ${transfer.passengers || 1}\nFornecedor: ${transfer.provider || 'N/A'}\nConfirmação: ${transfer.confirmation_number || 'N/A'}`,
    start: { date: transfer.transfer_date },
    end: { date: transfer.transfer_date },
    colorId: COLOR_IDS.transfer,
    location: transfer.pickup_location,
  };
}

async function createOrUpdateCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent,
  existingEventId?: string
): Promise<string | null> {
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  
  try {
    if (existingEventId) {
      // Update existing event
      const response = await fetch(`${baseUrl}/${existingEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const data = await response.json();
        return data.id;
      }
      
      // If update fails, try to create new
      console.log('Update failed, creating new event');
    }

    // Create new event
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create event:', error);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating/updating event:', error);
    return null;
  }
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    return response.ok || response.status === 404;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

export async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validated = await parseAndValidate(req, syncSchema);
    if (!validated.ok) {
      return new Response(JSON.stringify({ error: validated.error }), {
        status: validated.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payload = validated.data;
    const action = payload.action;
    // Only per-reservation variants carry these — guard downstream reads.
    const reservation_type = action === 'sync_all' ? undefined : payload.reservation_type;
    const reservation_id = action === 'sync_all' ? undefined : payload.reservation_id;

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get calendar ID
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('calendar_id')
      .eq('user_id', user.id)
      .single();

    const calendarId = integration?.calendar_id || 'primary';

    // Handle delete action
    if (action === 'delete') {
      const { data: calendarEvent } = await supabase
        .from('calendar_events')
        .select('google_event_id')
        .eq('user_id', user.id)
        .eq('reservation_type', reservation_type)
        .eq('reservation_id', reservation_id)
        .single();

      if (calendarEvent) {
        await deleteCalendarEvent(accessToken, calendarId, calendarEvent.google_event_id);
        
        await supabase
          .from('calendar_events')
          .delete()
          .eq('user_id', user.id)
          .eq('reservation_type', reservation_type)
          .eq('reservation_id', reservation_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle sync action (create or update)
    if (action === 'sync') {
      // Get reservation data based on type
      const tableMap: Record<string, string> = {
        ticket: 'travel_tickets',
        hotel: 'travel_hotel_reservations',
        car: 'travel_car_rentals',
        cruise: 'travel_cruises',
        insurance: 'travel_insurances',
        attraction: 'travel_attractions',
        transfer: 'travel_transfers',
      };

      const tableName = reservation_type ? tableMap[reservation_type] : undefined;
      if (!tableName) {
        return new Response(JSON.stringify({ error: 'Invalid reservation type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: reservation, error: reservationError } = await supabase
        .from(tableName)
        .select('*, travel_clients(name)')
        .eq('id', reservation_id)
        .eq('user_id', user.id)
        .single();

      if (reservationError || !reservation) {
        return new Response(JSON.stringify({ error: 'Reservation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const clientName = reservation.travel_clients?.name || 'Cliente';

      // Format event based on type
      let event: CalendarEvent;
      switch (reservation_type) {
        case 'ticket':
          event = formatTicketEvent(reservation, clientName);
          break;
        case 'hotel':
          event = formatHotelEvent(reservation, clientName);
          break;
        case 'car':
          event = formatCarEvent(reservation, clientName);
          break;
        case 'cruise':
          event = formatCruiseEvent(reservation, clientName);
          break;
        case 'insurance':
          event = formatInsuranceEvent(reservation, clientName);
          break;
        case 'attraction':
          event = formatAttractionEvent(reservation, clientName);
          break;
        case 'transfer':
          event = formatTransferEvent(reservation, clientName);
          break;
        default:
          return new Response(JSON.stringify({ error: 'Invalid reservation type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('google_event_id')
        .eq('user_id', user.id)
        .eq('reservation_type', reservation_type)
        .eq('reservation_id', reservation_id)
        .single();

      const googleEventId = await createOrUpdateCalendarEvent(
        accessToken,
        calendarId,
        event,
        existingEvent?.google_event_id
      );

      if (!googleEventId) {
        return new Response(JSON.stringify({ error: 'Failed to sync event' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save mapping
      await supabase
        .from('calendar_events')
        .upsert({
          user_id: user.id,
          google_event_id: googleEventId,
          reservation_type,
          reservation_id,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,reservation_type,reservation_id',
        });

      return new Response(JSON.stringify({ success: true, google_event_id: googleEventId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle sync all action
    if (action === 'sync_all') {
      const tables = [
        { name: 'travel_tickets', type: 'ticket' },
        { name: 'travel_hotel_reservations', type: 'hotel' },
        { name: 'travel_car_rentals', type: 'car' },
        { name: 'travel_cruises', type: 'cruise' },
        { name: 'travel_insurances', type: 'insurance' },
        { name: 'travel_attractions', type: 'attraction' },
        { name: 'travel_transfers', type: 'transfer' },
      ];

      let synced = 0;
      let failed = 0;

      for (const table of tables) {
        const { data: reservations } = await supabase
          .from(table.name)
          .select('*, travel_clients(name)')
          .eq('user_id', user.id);

        if (!reservations) continue;

        for (const reservation of reservations) {
          const clientName = reservation.travel_clients?.name || 'Cliente';
          
          let event: CalendarEvent;
          switch (table.type) {
            case 'ticket':
              event = formatTicketEvent(reservation, clientName);
              break;
            case 'hotel':
              event = formatHotelEvent(reservation, clientName);
              break;
            case 'car':
              event = formatCarEvent(reservation, clientName);
              break;
            case 'cruise':
              event = formatCruiseEvent(reservation, clientName);
              break;
            case 'insurance':
              event = formatInsuranceEvent(reservation, clientName);
              break;
            case 'attraction':
              event = formatAttractionEvent(reservation, clientName);
              break;
            case 'transfer':
              event = formatTransferEvent(reservation, clientName);
              break;
            default:
              continue;
          }

          const { data: existingEvent } = await supabase
            .from('calendar_events')
            .select('google_event_id')
            .eq('user_id', user.id)
            .eq('reservation_type', table.type)
            .eq('reservation_id', reservation.id)
            .single();

          const googleEventId = await createOrUpdateCalendarEvent(
            accessToken,
            calendarId,
            event,
            existingEvent?.google_event_id
          );

          if (googleEventId) {
            await supabase
              .from('calendar_events')
              .upsert({
                user_id: user.id,
                google_event_id: googleEventId,
                reservation_type: table.type,
                reservation_id: reservation.id,
                last_synced_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,reservation_type,reservation_id',
              });
            synced++;
          } else {
            failed++;
          }
        }
      }

      console.log(`Sync all completed: ${synced} synced, ${failed} failed`);

      return new Response(JSON.stringify({ success: true, synced, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
