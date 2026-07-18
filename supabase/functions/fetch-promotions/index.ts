import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';

const SOURCES = [
  {
    name: 'MelhoresCartões',
    url: 'https://www.melhorescartoes.com.br/c/promocoes-milhas',
    baseUrl: 'https://www.melhorescartoes.com.br',
  },
  {
    name: 'Passageiro de Primeira',
    url: 'https://passageirodeprimeira.com/black-friday-2025',
    baseUrl: 'https://passageirodeprimeira.com',
  },
  {
    name: 'Livelo',
    url: 'https://www.livelo.com.br/ganhe-pontos-parceiros-favoritos',
    baseUrl: 'https://www.livelo.com.br',
  },
  {
    name: 'Melhores Destinos',
    url: 'https://www.melhoresdestinos.com.br/promocao-passagens-aereas',
    baseUrl: 'https://www.melhoresdestinos.com.br',
  },
];

// Extract links and their text from HTML
// In-memory rate limiter (per-IP)
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
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

function extractLinksWithText(html: string, baseUrl: string): string {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    const text = match[2]
      .replace(/<[^>]+>/g, '') // Remove nested HTML tags
      .replace(/\s+/g, ' ')
      .trim();
    
    // Skip empty text, navigation links, or non-article links
    if (!text || text.length < 10) continue;
    if (href.startsWith('#') || href.startsWith('javascript:')) continue;
    if (href.includes('login') || href.includes('cadastro') || href.includes('privacidade')) continue;
    
    // Make relative URLs absolute
    if (href.startsWith('/')) {
      href = baseUrl + href;
    } else if (!href.startsWith('http')) {
      href = baseUrl + '/' + href;
    }
    
    // Only include article-like links
    if (href.includes(baseUrl) || href.includes('passageirodeprimeira') || href.includes('melhorescartoes') || href.includes('melhoresdestinos')) {
      links.push(`[LINK: ${href}] ${text}`);
    }
  }
  
  return links.join('\n');
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // Rate limit check
  const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return createCorsErrorResponse('Rate limit exceeded. Try again in 1 minute.', req, 429);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify authentication before proceeding
    const { user, error: authError } = await verifyAuth(req, supabase);
    if (authError || !user) {
      console.log('Unauthorized fetch-promotions attempt');
      return createCorsResponse({
        success: false,
        error: 'Authentication required'
      }, req, 401);
    }

    // Plan 02-06 W2b extension (D-13): personalized=true returns only promos
    // whose from_program intersects the caller's user_programs. compute-
    // personalized-promos uses this branch when populating user_promo_alerts;
    // the regular fetch path (no query param) still hits the full scrape.
    const url = new URL(req.url);
    const personalized = url.searchParams.get('personalized') === 'true';
    if (personalized) {
      const { data: userProgs = [] } = await supabase
        .from('user_programs')
        .select('program_name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const userProgramSet = new Set(
        (userProgs as Array<{ program_name: string }>)
          .map((p) => String(p.program_name ?? '').toLowerCase()),
      );

      const { data: activePromos = [] } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      const filtered = (activePromos as Array<{
        from_program?: string | null;
        program?: string | null;
      }>).filter((promo) => {
        const from = String(promo.from_program ?? promo.program ?? '').toLowerCase();
        return from && userProgramSet.has(from);
      });

      return createCorsResponse({
        success: true,
        personalized: true,
        count: filtered.length,
        promotions: filtered,
      }, req);
    }

    console.log(`User ${user.id} starting promotions fetch...`);

    const allPromotions: any[] = [];

    for (const source of SOURCES) {
      console.log(`Fetching from ${source.name}...`);
      
      try {
        // Fetch the page content
        const pageResponse = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });

        if (!pageResponse.ok) {
          console.error(`Failed to fetch ${source.name}: ${pageResponse.status}`);
          continue;
        }

        const html = await pageResponse.text();
        
        // Extract links with their text (preserving URLs)
        const linksContent = extractLinksWithText(html, source.baseUrl);
        
        // Also extract general text content for context
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 4000);

        // Combine links and text content
        const contentForAI = `LINKS COM TEXTO:\n${linksContent}\n\nCONTEXTO ADICIONAL:\n${textContent}`.slice(0, 10000);

        console.log(`Extracted ${linksContent.length} chars of links from ${source.name}`);

        // Use Lovable AI to extract promotions WITH their specific links
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Você é um extrator de promoções de milhas aéreas. Analise o conteúdo e extraia promoções ativas.

IMPORTANTE: O conteúdo inclui links no formato [LINK: URL] seguido do texto. Você DEVE extrair o link específico de cada promoção.

Para cada promoção encontrada, classifique o tipo:
- "promo": Promoções gerais, bônus de transferência, ofertas especiais
- "bonus": Bônus em compras, pontos extras
- "warning": Alertas importantes, prazos, vencimentos
- "income": Cashback, créditos, pontos creditados

Responda APENAS com um array JSON válido. Cada item DEVE ter o campo "link" com a URL específica da notícia. Exemplo:
[
  {
    "type": "promo",
    "title": "Livelo com 100% de bônus",
    "description": "Transferências para Smiles com bônus dobrado até dia 30",
    "link": "https://site.com/noticia-especifica"
  }
]

REGRAS:
1. O campo "link" é OBRIGATÓRIO e deve ser a URL específica do artigo/notícia
2. NÃO use a URL genérica da página, use o link específico encontrado
3. Se não encontrar o link específico, use o formato mais provável baseado no título
4. Se não encontrar promoções, retorne: []`
              },
              {
                role: 'user',
                content: `Extraia as promoções de milhas deste conteúdo do site ${source.name} (${source.url}):\n\n${contentForAI}`
              }
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error: ${aiResponse.status} - ${errorText}`);
          
          if (aiResponse.status === 429) {
            console.error('Rate limit exceeded');
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '[]';
        
        console.log(`AI response: ${aiContent.slice(0, 500)}`);

        // Parse AI response
        let extracted: any[] = [];
        try {
          // Try to extract JSON from the response
          const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
        }

        // Add source info to each promotion
        for (const promo of extracted) {
          if (promo.title && promo.type) {
            // Validate and clean the link
            let promoLink = promo.link || source.url;
            
            // Ensure link is a valid URL
            if (!promoLink.startsWith('http')) {
              promoLink = source.baseUrl + (promoLink.startsWith('/') ? '' : '/') + promoLink;
            }
            
            allPromotions.push({
              type: promo.type,
              title: promo.title,
              description: promo.description || '',
              link: promoLink,
              source: source.name,
              is_active: true,
            });
          }
        }

        console.log(`Extracted ${extracted.length} promotions from ${source.name}`);

      } catch (sourceError) {
        console.error(`Error processing ${source.name}:`, sourceError);
      }
    }

    console.log(`Total promotions found: ${allPromotions.length} by user ${user.id}`);

    // Insert new promotions (avoiding duplicates by title)
    let insertedCount = 0;
    for (const promo of allPromotions) {
      // Check if promotion already exists
      const { data: existing } = await supabase
        .from('promotions')
        .select('id')
        .eq('title', promo.title)
        .eq('is_active', true)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('promotions')
          .insert(promo);

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          insertedCount++;
          console.log(`Inserted: ${promo.title} with link: ${promo.link}`);
        }
      } else {
        console.log(`Skipped duplicate: ${promo.title}`);
      }
    }

    return createCorsResponse({
      success: true,
      found: allPromotions.length,
      inserted: insertedCount,
      promotions: allPromotions,
    }, req);

  } catch (error) {
    console.error('Error in fetch-promotions:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      req,
      500
    );
  }
});
