import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';

const BACKUP_TABLES = [
  'operations',
  'credit_cards',
  'holders',
  'program_accounts',
  'user_subscriptions',
  'subscription_history',
  'travel_clients',
  'client_messages',
  'agency_settings',
  'profiles',
  'user_roles',
  'program_market_prices',
];

const MAX_BACKUP_AGE_DAYS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createCorsErrorResponse('Unauthorized', req, 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return createCorsErrorResponse('Invalid token', req, 401);
    }

    // P1-9 — Admin gate unified on `profiles.is_admin` (matches mrr-dashboard
    // and AdminMetrics.tsx client-side check). Previously this function used
    // `user_roles.role = 'admin'` while mrr-dashboard used `profiles.is_admin`,
    // creating a drift risk: a newly-promoted admin would only work in half
    // the functions until both tables were updated.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return createCorsErrorResponse('Admin access required', req, 403);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDate = new Date().toISOString().split('T')[0];

    // Export each table
    const backup: Record<string, any> = {
      _meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: BACKUP_TABLES,
      },
    };

    let totalRows = 0;

    for (const table of BACKUP_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(50000);

      if (error) {
        console.warn(`Skipping table ${table}: ${error.message}`);
        backup[table] = { _error: error.message };
        continue;
      }

      backup[table] = data || [];
      totalRows += (data?.length || 0);
      console.log(`Backed up ${table}: ${data?.length || 0} rows`);
    }

    backup._meta.totalRows = totalRows;

    // Save to Supabase Storage
    const backupPath = `backups/${backupDate}/full-backup-${timestamp}.json`;
    const backupJson = JSON.stringify(backup, null, 2);

    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(backupPath, new Blob([backupJson], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Try to create bucket if it doesn't exist
      await supabase.storage.createBucket('backups', { public: false });
      const { error: retryError } = await supabase.storage
        .from('backups')
        .upload(backupPath, new Blob([backupJson], { type: 'application/json' }), {
          contentType: 'application/json',
          upsert: true,
        });
      if (retryError) throw retryError;
    }

    // Clean up old backups (>30 days)
    const { data: backups } = await supabase.storage
      .from('backups')
      .list('backups', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    if (backups && backups.length > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_BACKUP_AGE_DAYS);

      for (const folder of backups) {
        const folderDate = new Date(folder.name);
        if (!isNaN(folderDate.getTime()) && folderDate < cutoffDate) {
          // Delete old backup folder
          const { data: oldFiles } = await supabase.storage
            .from('backups')
            .list(`backups/${folder.name}`);

          if (oldFiles) {
            for (const file of oldFiles) {
              await supabase.storage
                .from('backups')
                .remove([`backups/${folder.name}/${file.name}`]);
            }
          }
          console.log(`Cleaned up old backup: ${folder.name}`);
        }
      }
    }

    return createCorsResponse({
      success: true,
      backup: {
        path: backupPath,
        timestamp: backup._meta.timestamp,
        tables: BACKUP_TABLES.length,
        totalRows,
        sizeBytes: backupJson.length,
      },
    }, req);

  } catch (error) {
    console.error('Backup error:', error);
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Backup failed',
      req,
      500
    );
  }
});
