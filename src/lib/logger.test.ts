import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const originalEnv = import.meta.env.DEV;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger methods are callable without throwing', async () => {
    const { logger } = await import('./logger');
    expect(() => logger.log('test')).not.toThrow();
    expect(() => logger.error('err')).not.toThrow();
    expect(() => logger.warn('warn')).not.toThrow();
    expect(() => logger.info('info')).not.toThrow();
    expect(() => logger.debug('debug')).not.toThrow();
  });

  it('default export works', async () => {
    const mod = await import('./logger');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default.log).toBe('function');
  });
});
