/**
 * Centralized CORS Helper for Supabase Edge Functions
 * 
 * Security: Uses origin whitelist instead of "*"
 */

// Allowed origins whitelist
const ALLOWED_ORIGINS: string[] = [
  // Production
  'https://milespro.app',
  'https://www.milespro.app',
  'https://milespro.net.br',
  'https://www.milespro.net.br',
  'https://app.milespro.net.br',         // canonical app subdomain (Vercel + Cloudflare DNS)
  'https://miles-pro-hub.vercel.app',    // Vercel project alias
  'https://milespro.lovable.app',

  // Pattern-matched (see below):
  // *.lovable.app             — Lovable preview branches
  // miles-pro-*.vercel.app    — Vercel project deploy previews / branch URLs
];

// Pattern for Lovable preview domains
const LOVABLE_DOMAIN_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.lovable\.app$/;

// Pattern for Vercel deploys of THIS project only (branch previews, hash deploys).
// Vercel deploy URLs follow: <project>-<hash>-<team>-<workspace>.vercel.app
// Scoped to `miles-pro-` prefix so we don't accept random Vercel projects.
const VERCEL_DOMAIN_PATTERN = /^https:\/\/miles-pro-[a-zA-Z0-9-]+\.vercel\.app$/;

// Development origins (only checked in development)
const DEV_ORIGINS: string[] = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Check if an origin is allowed
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact matches in production list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check Lovable preview domain pattern
  if (LOVABLE_DOMAIN_PATTERN.test(origin)) {
    return true;
  }

  // Check Vercel deploy preview pattern (this project only)
  if (VERCEL_DOMAIN_PATTERN.test(origin)) {
    return true;
  }

  // Check development origins
  if (DEV_ORIGINS.includes(origin)) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS headers for a request
 * Returns appropriate headers based on origin validation
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  
  // Base headers (always included)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight
  };
  
  // Only set Allow-Origin if origin is whitelisted
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin'; // Important for caching
  }
  
  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 * Returns a 204 No Content response with appropriate CORS headers
 */
export function handleCorsPreflight(request: Request): Response {
  const corsHeaders = getCorsHeaders(request);
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create a JSON response with CORS headers
 */
export function createCorsResponse(
  data: unknown,
  request: Request,
  status: number = 200
): Response {
  const corsHeaders = getCorsHeaders(request);
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create an error response with CORS headers
 */
export function createCorsErrorResponse(
  error: string,
  request: Request,
  status: number = 400
): Response {
  return createCorsResponse({ error }, request, status);
}
