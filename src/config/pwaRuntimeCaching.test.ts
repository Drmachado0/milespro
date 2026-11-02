import { describe, expect, it } from 'vitest';

import { createSupabaseRuntimeCaching } from './pwaRuntimeCaching';

describe('Supabase PWA runtime caching', () => {
  const currentProjectUrl = 'https://ermpialrzbnyfkatrxeq.supabase.co';
  const rules = createSupabaseRuntimeCaching(currentProjectUrl);

  it('uses the active project and never caches REST, Auth, or Edge Function responses', () => {
    const protectedEndpoints = [
      `${currentProjectUrl}/rest/v1/operations`,
      `${currentProjectUrl}/auth/v1/user`,
      `${currentProjectUrl}/functions/v1/create-checkout-session`,
    ];

    for (const url of protectedEndpoints) {
      const rule = rules.find(({ urlPattern }) => urlPattern.test(url));
      expect(rule, `missing runtime rule for ${url}`).toBeDefined();
      expect(rule?.handler).toBe('NetworkOnly');
      expect(rule?.options).toBeUndefined();
    }

    expect(
      rules.some(({ urlPattern }) =>
        urlPattern.test('https://opusftqbbaozucmbuuug.supabase.co/rest/v1/operations'),
      ),
    ).toBe(false);
  });
});
