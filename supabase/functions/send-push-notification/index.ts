/**
 * send-push-notification — Phase 3 W2 (Plan 03-04b) — MOBILE-04.
 *
 * FCM HTTP v1 wrapper. Called by enqueue-push once per device token; each
 * call mints (or reuses cached) OAuth2 access token from the service-account
 * JSON, builds an FCM v1 message with iOS thread-id + Android notification
 * tag both keyed by group_key (Q4 RESOLVED — visual grouping across devices),
 * then POSTs to https://fcm.googleapis.com/v1/projects/<project_id>/messages:send.
 *
 * Stale-token handling: FCM returns 404 UNREGISTERED for tokens that have
 * been invalidated (uninstall, sign-out, app data wipe). We DELETE the row
 * from push_subscriptions in that case so the next enqueue-push fan-out
 * doesn't waste an HTTP call.
 *
 * Auth: Bearer PUSH_SEND_AUTH_TOKEN (Vault-stored shared secret).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, getCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';
import { getFCMAccessToken, type FCMServiceAccount } from '../_shared/fcmSignJWT.ts';

interface RequestBody {
  device_token: string;
  platform: 'ios' | 'android';
  payload: {
    title: string;
    body: string;
    deep_link_path: string;
    balance_id?: string;
    [k: string]: unknown;
  };
  event_type: string;
  // group_key: Q4 RESOLVED — drives iOS apns thread-id + Android notification tag.
  group_key: string;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return createCorsErrorResponse('Method not allowed', req, 405);
  }

  // 1. Auth — Bearer PUSH_SEND_AUTH_TOKEN (constant-time).
  const PUSH_SEND_AUTH_TOKEN = Deno.env.get('PUSH_SEND_AUTH_TOKEN') ?? '';
  if (!PUSH_SEND_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_SEND_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!timingSafeEq(provided, PUSH_SEND_AUTH_TOKEN)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Parse body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return createCorsErrorResponse('Invalid JSON body', req, 400);
  }
  if (
    !body.device_token ||
    !body.platform ||
    !body.payload ||
    !body.event_type ||
    !body.group_key
  ) {
    return createCorsErrorResponse(
      'Missing required fields (device_token, platform, payload, event_type, group_key)',
      req,
      400,
    );
  }

  // 3. Load service account from env (Vault secret PUSH_FCM_SERVICE_ACCOUNT_JSON).
  const saJson = Deno.env.get('PUSH_FCM_SERVICE_ACCOUNT_JSON') ?? '';
  if (!saJson) {
    return createCorsErrorResponse('PUSH_FCM_SERVICE_ACCOUNT_JSON not set', req, 500);
  }
  let sa: FCMServiceAccount;
  try {
    sa = JSON.parse(saJson) as FCMServiceAccount;
  } catch (err) {
    return createCorsErrorResponse(`Invalid service-account JSON: ${String(err)}`, req, 500);
  }

  // 4. Mint (or fetch cached) OAuth2 access token via _shared/fcmSignJWT.ts.
  let accessToken: string;
  try {
    accessToken = await getFCMAccessToken(sa);
  } catch (err) {
    return createCorsErrorResponse(`FCM token mint failed: ${String(err)}`, req, 500);
  }

  // 5. Build FCM v1 payload.
  //    - message.token = body.device_token
  //    - message.notification = { title, body }
  //    - data carries deep_link_path + event_type + balance_id (for client coalescing)
  //    - apns.payload.aps.thread-id = group_key (iOS visual grouping — Q4 RESOLVED)
  //    - android.notification.tag = group_key (Android collapse — Q4 RESOLVED)
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const fcmPayload = {
    message: {
      token: body.device_token,
      notification: {
        title: body.payload.title,
        body: body.payload.body,
      },
      data: {
        deep_link_path: body.payload.deep_link_path,
        event_type: body.event_type,
        ...(body.payload.balance_id ? { balance_id: body.payload.balance_id } : {}),
      },
      apns: {
        payload: {
          aps: {
            alert: { title: body.payload.title, body: body.payload.body },
            sound: 'default',
            'thread-id': body.group_key,
          },
        },
      },
      android: {
        notification: { tag: body.group_key },
        priority: 'HIGH' as const,
      },
    },
  };

  const fcmResp = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  if (fcmResp.ok) {
    return createCorsResponse({ ok: true, group_key: body.group_key }, req);
  }

  // 6. Error handling — 404 / 400 INVALID_ARGUMENT means stale token; cleanup.
  const errText = await fcmResp.text();
  const isStale =
    fcmResp.status === 404 ||
    /UNREGISTERED|INVALID_ARGUMENT/.test(errText);

  if (isStale) {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // Disable auth-refresh interval on the service-role client to avoid
      // the setInterval leak Deno's strict test-resource tracker flags as
      // "An interval was started in this test, but never completed".
      // Service-role keys don't refresh, so persistSession is also pointless.
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('device_token', body.device_token);
    }
    return createCorsResponse(
      { ok: false, removed_stale: true, status: fcmResp.status, error: errText },
      req,
    );
  }

  return createCorsResponse(
    {
      ok: false,
      retry: fcmResp.status >= 500,
      status: fcmResp.status,
      error: errText,
    },
    req,
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
