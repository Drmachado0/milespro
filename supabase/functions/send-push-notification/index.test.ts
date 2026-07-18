// supabase/functions/send-push-notification/index.test.ts
//
// Phase 3 W2 (Plan 03-04b) — Deno tests for send-push-notification.
// Covers auth + Q4 RESOLVED thread-id/tag wiring + body validation.
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/send-push-notification/index.test.ts

import {
  assertEquals,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SEND_TOKEN = 'send-test-' + 'x'.repeat(40);
// 2048-bit RSA test key (PKCS#8, PEM). NOT a real production key.
// Bumped from the previous 1024-bit fixture: Deno 1.46.3's signer.rs path
// panicked when asked to RSASSA-PKCS1-v1_5/SHA-256-sign with a 1024-bit
// key (signature::Error at signer.rs:16:28), which aborted this test file
// before the rejects-missing-required-fields case could finish reporting.
// Any RSA key 2048+ is acceptable per RFC 8017 §2; 2048 is the minimum FCM
// will accept in production anyway.
const FAKE_SA_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'test-project',
  client_email: 'test@test.iam.gserviceaccount.com',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDIlJNR9DenNUgT\nw7MCiEC5GaV4TwDGH0m2y7cE973ozt2fY4prse7zabhjtzp8kqK9TvU0mDOekEFg\n9YQNIpOlbIVuD2cfJLKnIUV3jOm7cc2BodQXu6uTxkag8mt99JxVJClfz8gi9hiV\nogSyeeNCS9VCq62Tve73xMmnQPsNltHfcZwA58DArGhsMrIyg+wZ2Ld4gZwsSM7Y\nsZLRO/fhcVDEV+00d3pXK2iZ+V8zq5d5NSyyoIPJp3k9KEWvOh1jVZIFvLA/U231\nyGxwO5SlOYXkf5RUq7XJTci3nXEWfMmidQIRJrrCBkKAfB+VtV6Mi/rpCsP50iV5\n/JNXkfhDAgMBAAECggEARyh+gyqSu90pLunUjedsnr48d8v/SEo9Sn5G9Zo2Y2tQ\nMIWNy9saHHy7D5UnSJ504ZgrYXdFiNFAgHdZW5eSrbMsOvl36hKI1sX08Q6qtPcQ\noxaYObs4iXpkACFAhTTMaWAk1XrPU6fe3ObXp8GaICDrDXX+ZFWTe47yw0VIS28/\nRkmDu+2OvErh/hiLIY/fsIM6Ks4b0n1sh5NuIAOwpjSHS9ioZWnWzHyMb9ZcCK6e\nYq3y7hiyJMxA4VpHeIq1A4lXuiiAu9n5EiL+vKho5FcXZ8UMVFMhxMquOT+JeLXl\nuELpnMeNw0FDchpiqbNs0R7rJyFS3nE1mAQyckh30QKBgQDlW9izbuq7EzNCC33c\nWb2VwEikMLO6EkbI2sRBFvLS86dYiJiphT3acoZKDLXkxViqSguuRNQxP55ETW+i\nft7xBTZLwJWlzX6H5n2QbeCzMhlVs3YhXQsUliTRK4ulGArJwmVAgVgMLXB4Sutn\n6KWHEGv1oE9RDBaqq+p1SlpYDwKBgQDf4PtYKMyn2HxGGZfRyy0p+OZ673NvGUR5\nG/ygowh1tHQ5MVTakzYOBOREUH9bK8SLs+dvA2qWnP36t0RxY6Rr9o0U8owcFHmF\ncz9Pfmlaj0qavn+BWq+ltxBbl3UP1ubRoNpVVFYhWPvOy/O3vbsvdGujtM77ZgNQ\nPvSPNwEIjQKBgCtlZWsN4Xvj9h7Y7cdzc1uSNixayqa6LopyWg+2t9sSHuexcLEi\ndMGQSbhZD1FpxYzy1aLzgvKOhvOFc0nbl3Mi+VL77VShvP8ZrUhWgd1l7UU533AQ\nmrgacHzjMFjcY64pCd9amb40GsOn6UKP0kHr6YFgA6HiF6fTP1lR6CYhAoGBAMPj\nOCjwMfneywYPGK7hRthFx2zjnS4lfqs1WLs5S4qp5VOxnVxOmGp1z0ES6gxc5HGU\nbTjOVXIJVZUMzB8mn1Qz+0fL3don9BhXOZsVsZsia5WwfyIwtiWaYv6xLCU61OWx\nB7jHvUEaeeF8xPgNU/52sEQiTUTdAqMxIo05BHd1AoGBAJvJEF3Mpf8+ddRcM4E3\nrpYJpcod83sDl1xbsg/H46pfxUlWFyQqgdY/4ZMfjSUC4c6qTnhfL/pilyO9Z9c1\nU17yNS+6VJvIvqRymCuil5sS7q1Yu5eKBev6PQ9YDBOOtThyOF3R7/YcEbDZuABW\njjMn48OhBBr11uu0/6Ii/DYO\n-----END PRIVATE KEY-----',
  token_uri: 'https://oauth2.googleapis.com/token',
});

Deno.env.set('PUSH_SEND_AUTH_TOKEN', SEND_TOKEN);
Deno.env.set('PUSH_FCM_SERVICE_ACCOUNT_JSON', FAKE_SA_JSON);
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');

// Capture outbound calls so the Q4 wiring test can inspect FCM payload shape.
type Capture = { url: string; body: Record<string, unknown> | null };
const captures: Capture[] = [];
// deno-lint-ignore no-explicit-any
(globalThis as any).__sendPushCaptures = captures;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url = typeof input === 'string'
    ? input
    : (input instanceof URL ? input.toString() : input.url);

  // Mock OAuth2 token exchange → return a fake access_token (cached after first call).
  if (url === 'https://oauth2.googleapis.com/token') {
    return new Response(
      JSON.stringify({ access_token: 'fake-access-token', expires_in: 3600 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Mock FCM v1 send → capture the payload, return 200.
  if (url.startsWith('https://fcm.googleapis.com/v1/projects/')) {
    let body: Record<string, unknown> | null = null;
    try {
      body = init?.body ? JSON.parse(init.body as string) : null;
    } catch {
      body = null;
    }
    captures.push({ url, body });
    return new Response(JSON.stringify({ name: 'projects/test-project/messages/abc' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return originalFetch(input, init);
};

Deno.test('send-push-notification — rejects missing Authorization → 401', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/send-push-notification', {
    method: 'POST',
    body: JSON.stringify({
      device_token: 'tok',
      platform: 'ios',
      payload: { title: 't', body: 'b', deep_link_path: '/d' },
      event_type: 'onboarding',
      group_key: 'onboarding:global',
    }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 401);
});

Deno.test('send-push-notification — rejects wrong Bearer → 401', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/send-push-notification', {
    method: 'POST',
    headers: { Authorization: 'Bearer WRONG_TOKEN_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    body: JSON.stringify({
      device_token: 'tok',
      platform: 'ios',
      payload: { title: 't', body: 'b', deep_link_path: '/d' },
      event_type: 'onboarding',
      group_key: 'onboarding:global',
    }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 401);
});

Deno.test('send-push-notification — rejects missing required fields (no group_key) → 400', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/send-push-notification', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SEND_TOKEN}` },
    body: JSON.stringify({
      device_token: 'tok',
      platform: 'ios',
      payload: { title: 't', body: 'b', deep_link_path: '/d' },
      event_type: 'onboarding',
      // group_key intentionally omitted
    }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 400);
});

Deno.test('send-push-notification — FCM v1 payload carries apns thread-id + android tag === group_key (Q4 RESOLVED)', async () => {
  captures.length = 0;
  // Reset FCM token cache so the test exercises the OAuth path fresh.
  const sigMod = await import('../_shared/fcmSignJWT.ts');
  sigMod._resetFCMTokenCache?.();

  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/send-push-notification', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SEND_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_token: 'tok-1234',
      platform: 'ios',
      payload: {
        title: 'Suas milhas vencem em 13 dias',
        body: 'Smiles: 50.000 pontos vencem em 2026-05-27.',
        deep_link_path: '/programa/abc',
        balance_id: '33333333-3333-3333-3333-333333333333',
      },
      event_type: 'expiry_13d',
      group_key: 'expiry_13d:33333333-3333-3333-3333-333333333333',
    }),
  });
  const res = await mod.handler(req);

  // FCM mock returned 200 — handler returns 200 ok:true.
  assertEquals(res.status, 200);
  assert(captures.length === 1, `expected exactly 1 FCM call, got ${captures.length}`);
  const sent = captures[0].body as { message?: Record<string, unknown> };
  const msg = sent.message ?? {};
  // Q4 RESOLVED — iOS thread-id keyed by (event_type, balance_id)
  const apns = (msg.apns as { payload?: { aps?: Record<string, unknown> } } | undefined) ?? {};
  const aps = apns.payload?.aps ?? {};
  assertEquals(
    (aps as Record<string, unknown>)['thread-id'],
    'expiry_13d:33333333-3333-3333-3333-333333333333',
  );
  // Q4 RESOLVED — Android tag keyed identically
  const android = (msg.android as { notification?: Record<string, unknown> } | undefined) ?? {};
  const aNotif = android.notification ?? {};
  assertEquals(
    (aNotif as Record<string, unknown>).tag,
    'expiry_13d:33333333-3333-3333-3333-333333333333',
  );
  // balance_id propagates to data payload for client-side coalescing
  const data = (msg.data as Record<string, unknown> | undefined) ?? {};
  assertEquals(data.balance_id, '33333333-3333-3333-3333-333333333333');
  assertEquals(data.deep_link_path, '/programa/abc');
  assertEquals(data.event_type, 'expiry_13d');
});
