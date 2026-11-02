export interface SupabaseRuntimeCachingRule {
  urlPattern: RegExp;
  handler: 'NetworkOnly' | 'CacheFirst';
  options?: {
    cacheName: string;
    expiration: {
      maxEntries: number;
      maxAgeSeconds: number;
    };
    cacheableResponse: {
      statuses: number[];
    };
  };
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds the service-worker policy for the configured Supabase project.
 * User-scoped and mutable endpoints deliberately remain network-only so an
 * authenticated response can never leak through Cache Storage.
 */
export function createSupabaseRuntimeCaching(
  supabaseUrl: string,
): SupabaseRuntimeCachingRule[] {
  const origin = new URL(supabaseUrl).origin;
  const projectOrigin = escapeRegExp(origin);

  return [
    {
      urlPattern: new RegExp(`^${projectOrigin}/rest/.*`, 'i'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: new RegExp(`^${projectOrigin}/auth/.*`, 'i'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: new RegExp(`^${projectOrigin}/functions/.*`, 'i'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: new RegExp(`^${projectOrigin}/storage/.*`, 'i'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'storage-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ];
}
