/**
 * FCM HTTP v1 access-token mint from service-account JWT.
 *
 * Flow:
 *   1. Build JWT (header + payload + RS256 signature) using crypto.subtle
 *   2. Exchange JWT at token_uri for an OAuth2 access_token
 *   3. Cache token for ~expires_in - 60s
 *
 * Source: firebase.google.com/docs/cloud-messaging/migrate-v1
 */

export interface FCMServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

interface CachedToken {
  access_token: string;
  expires_at: number; // unix seconds
}

let cached: CachedToken | null = null;

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlEncodeStr(str: string): string {
  return b64urlEncodeBytes(new TextEncoder().encode(str));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  const body = pem.replace(header, '').replace(footer, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function getFCMAccessToken(sa: FCMServiceAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);

  if (cached && cached.expires_at > nowSec + 60) {
    return cached.access_token;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    exp: nowSec + 3600,
    iat: nowSec,
  };

  const headerB64 = b64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  const signatureB64 = b64urlEncodeBytes(new Uint8Array(signature));

  const jwt = `${signingInput}.${signatureB64}`;

  // token_uri is typically https://oauth2.googleapis.com/token for Firebase service accounts.
  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`FCM OAuth2 exchange failed: HTTP ${resp.status} — ${text}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  if (!data.access_token) {
    throw new Error('FCM OAuth2 response missing access_token');
  }

  cached = {
    access_token: data.access_token,
    expires_at: nowSec + data.expires_in,
  };

  return data.access_token;
}

/**
 * Resets the in-memory token cache. Used by tests.
 */
export function _resetFCMTokenCache(): void {
  cached = null;
}
