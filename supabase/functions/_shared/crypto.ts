/**
 * AES-GCM Encryption Utilities for Supabase Edge Functions (Deno)
 * 
 * Uses Web Crypto API for server-side encryption.
 * Key is stored as Supabase secret ENCRYPTION_KEY.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM

/**
 * Derive a CryptoKey from the raw ENCRYPTION_KEY string
 * Uses PBKDF2 to convert the password into a proper CryptoKey
 */
async function deriveKey(encryptionKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Use a fixed salt (in production, store this alongside encrypted data)
  // For Supabase per-user encryption, a unique salt per user would be better
  const salt = encoder.encode('MilesPro-Salt-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-GCM
 * Returns base64-encoded string: iv + ciphertext + tag
 */
export async function encrypt(plaintext: string, encryptionKey: string): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const encoder = new TextEncoder();
  
  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return base64-encoded
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext using AES-GCM
 */
export async function decrypt(encryptedData: string, encryptionKey: string): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

/**
 * Check if a string looks like it was encrypted (base64, contains IV)
 * Used to distinguish encrypted from plaintext tokens during migration
 */
export function looksEncrypted(value: string | null): boolean {
  if (!value) return false;
  try {
    const decoded = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    // Encrypted format should be at least IV + some data
    return decoded.byteLength > IV_LENGTH;
  } catch {
    return false;
  }
}