import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

// Dedicated cron token (rotate independently of SUPABASE_SERVICE_ROLE_KEY).
// Set as a Lovable Cloud secret; pg_cron schedules invoke this fn with the
// header `x-cron-secret: <CRON_SECRET>`. The legacy branch that accepted the
// service-role key as an `Authorization: Bearer ...` header was removed — it
// was a confused-deputy vector (any leak of the service role would let an
// attacker forge cron triggers) and used a non-constant-time string compare.
const CRON_SECRET = Deno.env.get('CRON_SECRET');

function verifyCronAuth(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret) return false;
  return timingSafeEq(cronSecret, CRON_SECRET);
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // Verify cron job authentication
    if (!verifyCronAuth(req)) {
      console.log('Unauthorized cleanup trigger attempt');
      return createCorsErrorResponse('Unauthorized', req, 401);
    }

    console.log('Starting cleanup of old promotions...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`Cutoff date for old promotions: ${cutoffDateStr}`);

    // Step 1: Deactivate old promotions (older than 7 days)
    const { data: deactivated, error: deactivateError } = await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('created_at', cutoffDateStr)
      .select('id');

    if (deactivateError) {
      console.error('Error deactivating old promotions:', deactivateError);
      throw deactivateError;
    }

    const deactivatedCount = deactivated?.length || 0;
    console.log(`Deactivated ${deactivatedCount} old promotions`);

    // Step 2: Delete promotions older than 30 days
    const deleteCutoff = new Date();
    deleteCutoff.setDate(deleteCutoff.getDate() - 30);
    const deleteCutoffStr = deleteCutoff.toISOString();

    const { data: deleted, error: deleteError } = await supabase
      .from('promotions')
      .delete()
      .lt('created_at', deleteCutoffStr)
      .select('id');

    if (deleteError) {
      console.error('Error deleting very old promotions:', deleteError);
      throw deleteError;
    }

    const deletedCount = deleted?.length || 0;
    console.log(`Deleted ${deletedCount} promotions older than 30 days`);

    // Step 3: Get all active promotion IDs
    const { data: activePromotions, error: activeError } = await supabase
      .from('promotions')
      .select('id');

    if (activeError) {
      console.error('Error fetching active promotions:', activeError);
      throw activeError;
    }

    const activePromotionIds = new Set((activePromotions || []).map(p => p.id));
    console.log(`Found ${activePromotionIds.size} promotions in database`);

    // Step 4: Find and delete orphan read records
    const { data: allReads, error: readsError } = await supabase
      .from('user_promotion_reads')
      .select('id, promotion_id');

    if (readsError) {
      console.error('Error fetching read records:', readsError);
      throw readsError;
    }

    // Find orphan reads (reads for promotions that no longer exist)
    const orphanReadIds = (allReads || [])
      .filter(read => !activePromotionIds.has(read.promotion_id))
      .map(read => read.id);

    console.log(`Found ${orphanReadIds.length} orphan read records`);

    let orphanDeletedCount = 0;
    if (orphanReadIds.length > 0) {
      // Delete in batches of 100
      for (let i = 0; i < orphanReadIds.length; i += 100) {
        const batch = orphanReadIds.slice(i, i + 100);
        const { error: orphanDeleteError } = await supabase
          .from('user_promotion_reads')
          .delete()
          .in('id', batch);

        if (orphanDeleteError) {
          console.error('Error deleting orphan reads batch:', orphanDeleteError);
        } else {
          orphanDeletedCount += batch.length;
        }
      }
    }

    console.log(`Deleted ${orphanDeletedCount} orphan read records`);

    const summary = {
      timestamp: new Date().toISOString(),
      deactivated_promotions: deactivatedCount,
      deleted_promotions: deletedCount,
      deleted_orphan_reads: orphanDeletedCount,
    };

    console.log('Cleanup completed:', summary);

    return createCorsResponse(summary, req);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cleanup failed:', errorMessage);
    return createCorsErrorResponse(errorMessage, req, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
