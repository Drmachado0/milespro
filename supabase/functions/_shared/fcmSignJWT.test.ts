// supabase/functions/_shared/fcmSignJWT.test.ts
//
// Deno tests for the FCM HTTP v1 JWT mint helper.
// Tests mock globalThis.fetch to avoid real OAuth2 network calls.
//
// Run with:
//   deno test --allow-all supabase/functions/_shared/fcmSignJWT.test.ts

import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getFCMAccessToken, _resetFCMTokenCache, FCMServiceAccount } from './fcmSignJWT.ts';

// Test-grade RSA 2048-bit PKCS8 private key. NOT used in production.
// Generated with: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
// Bumped from 1024 → 2048 alongside send-push-notification/index.test.ts:
// Deno 1.46.3's signer.rs path can panic on RSASSA-PKCS1-v1_5 SHA-256 with
// 1024-bit keys; 2048 is the modern minimum for RS256 anyway.
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDIlJNR9DenNUgT
w7MCiEC5GaV4TwDGH0m2y7cE973ozt2fY4prse7zabhjtzp8kqK9TvU0mDOekEFg
9YQNIpOlbIVuD2cfJLKnIUV3jOm7cc2BodQXu6uTxkag8mt99JxVJClfz8gi9hiV
ogSyeeNCS9VCq62Tve73xMmnQPsNltHfcZwA58DArGhsMrIyg+wZ2Ld4gZwsSM7Y
sZLRO/fhcVDEV+00d3pXK2iZ+V8zq5d5NSyyoIPJp3k9KEWvOh1jVZIFvLA/U231
yGxwO5SlOYXkf5RUq7XJTci3nXEWfMmidQIRJrrCBkKAfB+VtV6Mi/rpCsP50iV5
/JNXkfhDAgMBAAECggEARyh+gyqSu90pLunUjedsnr48d8v/SEo9Sn5G9Zo2Y2tQ
MIWNy9saHHy7D5UnSJ504ZgrYXdFiNFAgHdZW5eSrbMsOvl36hKI1sX08Q6qtPcQ
oxaYObs4iXpkACFAhTTMaWAk1XrPU6fe3ObXp8GaICDrDXX+ZFWTe47yw0VIS28/
RkmDu+2OvErh/hiLIY/fsIM6Ks4b0n1sh5NuIAOwpjSHS9ioZWnWzHyMb9ZcCK6e
Yq3y7hiyJMxA4VpHeIq1A4lXuiiAu9n5EiL+vKho5FcXZ8UMVFMhxMquOT+JeLXl
uELpnMeNw0FDchpiqbNs0R7rJyFS3nE1mAQyckh30QKBgQDlW9izbuq7EzNCC33c
Wb2VwEikMLO6EkbI2sRBFvLS86dYiJiphT3acoZKDLXkxViqSguuRNQxP55ETW+i
ft7xBTZLwJWlzX6H5n2QbeCzMhlVs3YhXQsUliTRK4ulGArJwmVAgVgMLXB4Sutn
6KWHEGv1oE9RDBaqq+p1SlpYDwKBgQDf4PtYKMyn2HxGGZfRyy0p+OZ673NvGUR5
G/ygowh1tHQ5MVTakzYOBOREUH9bK8SLs+dvA2qWnP36t0RxY6Rr9o0U8owcFHmF
cz9Pfmlaj0qavn+BWq+ltxBbl3UP1ubRoNpVVFYhWPvOy/O3vbsvdGujtM77ZgNQ
PvSPNwEIjQKBgCtlZWsN4Xvj9h7Y7cdzc1uSNixayqa6LopyWg+2t9sSHuexcLEi
dMGQSbhZD1FpxYzy1aLzgvKOhvOFc0nbl3Mi+VL77VShvP8ZrUhWgd1l7UU533AQ
mrgacHzjMFjcY64pCd9amb40GsOn6UKP0kHr6YFgA6HiF6fTP1lR6CYhAoGBAMPj
OCjwMfneywYPGK7hRthFx2zjnS4lfqs1WLs5S4qp5VOxnVxOmGp1z0ES6gxc5HGU
bTjOVXIJVZUMzB8mn1Qz+0fL3don9BhXOZsVsZsia5WwfyIwtiWaYv6xLCU61OWx
B7jHvUEaeeF8xPgNU/52sEQiTUTdAqMxIo05BHd1AoGBAJvJEF3Mpf8+ddRcM4E3
rpYJpcod83sDl1xbsg/H46pfxUlWFyQqgdY/4ZMfjSUC4c6qTnhfL/pilyO9Z9c1
U17yNS+6VJvIvqRymCuil5sS7q1Yu5eKBev6PQ9YDBOOtThyOF3R7/YcEbDZuABW
jjMn48OhBBr11uu0/6Ii/DYO
-----END PRIVATE KEY-----`;

const TEST_SA: FCMServiceAccount = {
  type: 'service_account',
  project_id: 'test-project-id',
  private_key: TEST_PRIVATE_KEY,
  client_email: 'test@test-project-id.iam.gserviceaccount.com',
  token_uri: 'https://oauth2.googleapis.com/token',
};

function makeMockFetch(status: number, body: unknown) {
  return (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };
}

Deno.test('getFCMAccessToken — signs JWT with RS256 service-account and exchanges for access_token', async () => {
  _resetFCMTokenCache();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { access_token: 'ya29.test-token', expires_in: 3600 });

  try {
    const token = await getFCMAccessToken(TEST_SA);
    assertEquals(token, 'ya29.test-token');
  } finally {
    globalThis.fetch = originalFetch;
    _resetFCMTokenCache();
  }
});

Deno.test('getFCMAccessToken — caches within validity and skips re-exchange', async () => {
  _resetFCMTokenCache();

  let callCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
    callCount++;
    return Promise.resolve(
      new Response(JSON.stringify({ access_token: 'ya29.cached-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };

  try {
    const first = await getFCMAccessToken(TEST_SA);
    const second = await getFCMAccessToken(TEST_SA);
    assertEquals(first, 'ya29.cached-token');
    assertEquals(second, 'ya29.cached-token');
    assertEquals(callCount, 1, 'fetch should only be called once — second call hits cache');
  } finally {
    globalThis.fetch = originalFetch;
    _resetFCMTokenCache();
  }
});

Deno.test('getFCMAccessToken — throws on non-200 token endpoint response', async () => {
  _resetFCMTokenCache();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(401, { error: 'invalid_grant' });

  try {
    await assertRejects(
      () => getFCMAccessToken(TEST_SA),
      Error,
      'FCM OAuth2 exchange failed: HTTP 401',
    );
  } finally {
    globalThis.fetch = originalFetch;
    _resetFCMTokenCache();
  }
});

Deno.test('getFCMAccessToken — throws if response missing access_token', async () => {
  _resetFCMTokenCache();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { expires_in: 3600 });

  try {
    await assertRejects(
      () => getFCMAccessToken(TEST_SA),
      Error,
      'FCM OAuth2 response missing access_token',
    );
  } finally {
    globalThis.fetch = originalFetch;
    _resetFCMTokenCache();
  }
});
