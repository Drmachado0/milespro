import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';

const requestSchema = z.object({
  action: z.enum(['fetch-all', 'refresh', 'update-manual', 'get-price']),
  program: z.string().max(100).optional(),
  prices: z
    .array(
      z.object({
        program: z.string().min(1).max(100),
        buy_price: z.coerce.number().finite().nonnegative(),
        sell_price: z.coerce.number().finite().nonnegative(),
        source: z.string().max(50).optional(),
      }),
    )
    .max(200)
    .optional(),
});

// In-memory rate limiter (per-IP)
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return false;
  entry.count++;
  return true;
}

// Reference market prices - Brazilian market (R$/milheiro)
const MARKET_PRICES: Record<string, { buy: number; sell: number }> = {
  // Programas de Pontos (Brasil)
  'Livelo': { buy: 18.00, sell: 23.00 },
  'Esfera': { buy: 16.50, sell: 21.00 },
  'Átomos': { buy: 14.00, sell: 18.00 },
  'Átomos – Inter': { buy: 13.50, sell: 17.50 },
  'Átomos – C6 Bank': { buy: 14.50, sell: 18.50 },
  'Loop': { buy: 13.00, sell: 17.00 },
  'Curtai – BRB': { buy: 12.00, sell: 16.00 },
  'Nubank Rewards': { buy: 11.00, sell: 15.00 },
  'Mastercard Surpreenda': { buy: 8.00, sell: 12.00 },
  'Itaú Pontos': { buy: 15.00, sell: 19.00 },
  // Cias Aéreas (Brasil)
  'Smiles': { buy: 22.00, sell: 28.00 },
  'TudoAzul': { buy: 20.00, sell: 26.00 },
  'Latam': { buy: 25.00, sell: 32.00 },
  // Cias Aéreas (Internacionais)
  'TAP': { buy: 18.00, sell: 24.00 },
  'Ibéria': { buy: 16.00, sell: 22.00 },
  'MileagePlus': { buy: 30.00, sell: 38.00 },
  'AAdvantage': { buy: 28.00, sell: 36.00 },
  'Aeroplan': { buy: 24.00, sell: 30.00 },
  'ConnectMiles': { buy: 18.00, sell: 24.00 },
  'Delta SkyMiles': { buy: 26.00, sell: 34.00 },
  'British Airways': { buy: 24.00, sell: 32.00 },
  'Flying Blue': { buy: 22.00, sell: 28.00 },
  'Miles & More': { buy: 24.00, sell: 30.00 },
  'Emirates Skywards': { buy: 32.00, sell: 42.00 },
  'Etihad Guest': { buy: 28.00, sell: 36.00 },
  'KrisFlyer': { buy: 30.00, sell: 38.00 },
  'Qatar Privilege Club': { buy: 30.00, sell: 40.00 },
  // Redes de Hotéis
  'Accor ALL': { buy: 8.00, sell: 12.00 },
  'Hilton Honors': { buy: 6.00, sell: 10.00 },
  'Marriott Bonvoy': { buy: 9.00, sell: 13.00 },
  'World of Hyatt': { buy: 18.00, sell: 24.00 },
  'IHG One Rewards': { buy: 5.50, sell: 9.00 },
  'Wyndham Rewards': { buy: 5.00, sell: 8.00 },
  'Radisson Rewards': { buy: 6.00, sell: 10.00 },
  'Choice Privileges': { buy: 4.50, sell: 8.00 },
  'Best Western Rewards': { buy: 5.00, sell: 9.00 },
};

// Helper function to verify authentication
async function verifyAuth(req: Request, supabase: any): Promise<{ user: any | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }
  
  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // Rate limit check
  const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return createCorsErrorResponse('Rate limit exceeded. Try again in 1 minute.', req, 429);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const validated = await parseAndValidate(req, requestSchema);
    if (!validated.ok) {
      return createCorsErrorResponse(validated.error, req, validated.status);
    }
    const { action, program, prices: manualPricesPayload } = validated.data;

    if (action === 'fetch-all') {
      // Public read action - no auth required
      // Get latest prices from database
      const { data: dbPrices, error } = await supabase
        .from('program_market_prices')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) throw error;

      // Group by program to get latest
      const latestPrices: Record<string, any> = {};
      for (const price of dbPrices || []) {
        if (!latestPrices[price.program]) {
          latestPrices[price.program] = price;
        }
      }

      // If no prices in DB, use reference prices
      if (Object.keys(latestPrices).length === 0) {
        const prices = Object.entries(MARKET_PRICES).map(([prog, prices]) => ({
          program: prog,
          buy_price: prices.buy,
          sell_price: prices.sell,
          source: 'reference',
          fetched_at: new Date().toISOString(),
        }));
        return createCorsResponse({ success: true, prices }, req);
      }

      return createCorsResponse({ 
        success: true, 
        prices: Object.values(latestPrices) 
      }, req);
    }

    if (action === 'refresh') {
      // Write action requires authentication
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (authError || !user) {
        console.log('Unauthorized refresh attempt');
        return createCorsResponse({ 
          success: false, 
          error: 'Authentication required for refresh action' 
        }, req, 401);
      }

      console.log(`User ${user.id} refreshing market prices`);

      // Add small random variation to simulate market fluctuation
      const pricesToInsert = Object.entries(MARKET_PRICES).map(([prog, prices]) => {
        const buyVariation = (Math.random() - 0.5) * 2; // -1 to +1
        const sellVariation = (Math.random() - 0.5) * 2;
        return {
          program: prog,
          buy_price: Math.max(1, prices.buy + buyVariation).toFixed(2),
          sell_price: Math.max(1, prices.sell + sellVariation).toFixed(2),
          source: 'market_api',
          fetched_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('program_market_prices')
        .insert(pricesToInsert);

      if (error) throw error;

      console.log(`Refreshed ${pricesToInsert.length} market prices by user ${user.id}`);

      return createCorsResponse({ 
        success: true, 
        message: 'Prices refreshed',
        count: pricesToInsert.length 
      }, req);
    }

    // Manual price update action
    if (action === 'update-manual') {
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (authError || !user) {
        return createCorsResponse({ 
          success: false, 
          error: 'Authentication required' 
        }, req, 401);
      }

      if (!manualPricesPayload || manualPricesPayload.length === 0) {
        return createCorsResponse({
          success: false,
          error: 'Missing "prices" array. Expected items of { program, buy_price, sell_price, source? }',
        }, req, 400);
      }

      const pricesToInsert = manualPricesPayload.map((p) => ({
        program: p.program,
        buy_price: p.buy_price,
        sell_price: p.sell_price,
        source: p.source || 'manual',
        fetched_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('program_market_prices')
        .insert(pricesToInsert);

      if (error) throw error;

      console.log(`User ${user.id} updated ${pricesToInsert.length} manual prices`);

      return createCorsResponse({ 
        success: true, 
        message: 'Manual prices saved',
        count: pricesToInsert.length 
      }, req);
    }

    if (action === 'get-price' && program) {
      // Public read action - no auth required
      const refPrice = MARKET_PRICES[program];
      if (!refPrice) {
        return createCorsResponse({ 
          success: false, 
          error: 'Program not found' 
        }, req, 404);
      }

      // Check DB first
      const { data, error } = await supabase
        .from('program_market_prices')
        .select('*')
        .eq('program', program)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const price = data || {
        program,
        buy_price: refPrice.buy,
        sell_price: refPrice.sell,
        source: 'reference',
        fetched_at: new Date().toISOString(),
      };

      return createCorsResponse({ success: true, price }, req);
    }

    return createCorsResponse({ 
      success: false, 
      error: 'Invalid action' 
    }, req, 400);

  } catch (error) {
    console.error('Error:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      req,
      500
    );
  }
});
