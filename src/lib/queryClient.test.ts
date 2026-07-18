import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock matchMedia before import
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('queryKeys', () => {
  it('operations.list returns correct key', async () => {
    const { queryKeys } = await import('./queryClient');
    expect(queryKeys.operations.list({ status: 'active' })).toEqual(['operations', 'list', { status: 'active' }]);
  });

  it('operations.detail returns id key', async () => {
    const { queryKeys } = await import('./queryClient');
    expect(queryKeys.operations.detail('123')).toEqual(['operations', 'detail', '123']);
  });

  it('programBalances.byProgram returns program key', async () => {
    const { queryKeys } = await import('./queryClient');
    expect(queryKeys.programBalances.byProgram('smiles')).toEqual(['program_balances', 'smiles']);
  });

  it('tasks.pending returns pending key', async () => {
    const { queryKeys } = await import('./queryClient');
    expect(queryKeys.tasks.pending()).toEqual(['tasks', 'pending']);
  });
});
