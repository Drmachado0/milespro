import { describe, it, expect } from 'vitest';
import { prefetchRoute } from './useIntersectionPrefetch';

describe('useIntersectionPrefetch', () => {
  it('prefetchRoute does not throw for unknown route', () => {
    expect(() => prefetchRoute('/nonexistent')).not.toThrow();
  });

  it('prefetchRoute does not throw for valid route', () => {
    expect(() => prefetchRoute('/dashboard')).not.toThrow();
  });
});
