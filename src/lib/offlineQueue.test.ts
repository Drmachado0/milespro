import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    auth: { getUser: vi.fn() },
  },
}));

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('queueOperation stores in localStorage', async () => {
    const { queueOperation, getPendingCount } = await import('./offlineQueue');
    queueOperation('test_table', 'insert', { name: 'test' });
    expect(getPendingCount()).toBe(1);
  });

  it('getPendingOperations returns empty array when nothing stored', async () => {
    const { getPendingOperations } = await import('./offlineQueue');
    expect(getPendingOperations()).toEqual([]);
  });

  it('hasPendingOperations returns false when empty', async () => {
    const { hasPendingOperations } = await import('./offlineQueue');
    expect(hasPendingOperations()).toBe(false);
  });

  it('clearPendingOperations empties the queue', async () => {
    const { queueOperation, clearPendingOperations, getPendingCount } = await import('./offlineQueue');
    queueOperation('t', 'insert', {});
    expect(getPendingCount()).toBe(1);
    clearPendingOperations();
    expect(getPendingCount()).toBe(0);
  });

  it('syncPendingOperations processes queued items', async () => {
    const { queueOperation, syncPendingOperations, getPendingCount } = await import('./offlineQueue');
    queueOperation('operations', 'insert', { foo: 'bar' });
    const result = await syncPendingOperations();
    expect(result.synced).toBe(1);
    expect(getPendingCount()).toBe(0);
  });

  it('removeOperation removes specific item', async () => {
    const { queueOperation, removeOperation, getPendingCount } = await import('./offlineQueue');
    const id = queueOperation('t', 'insert', {});
    expect(getPendingCount()).toBe(1);
    removeOperation(id);
    expect(getPendingCount()).toBe(0);
  });
});
