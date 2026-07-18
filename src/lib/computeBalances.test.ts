import { describe, it, expect } from 'vitest';
import {
  computeProgramBalances,
  computeTotalBalance,
  computeHolderStats,
  type OperationLike,
} from './computeBalances';

const op = (overrides: Partial<OperationLike>): OperationLike => ({
  program: 'Smiles',
  type: 'compra' as never,
  quantity: 0,
  status: 'confirmado',
  ...overrides,
});

describe('computeProgramBalances', () => {
  it('adds purchases to balance', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000 }),
      op({ type: 'entrada_manual' as never, quantity: 5000 }),
    ]);
    expect(balances).toHaveLength(1);
    expect(balances[0].balance).toBe(15000);
  });

  it('subtracts sales and resgates', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000 }),
      op({ type: 'venda' as never, quantity: 3000 }),
      op({ type: 'resgate' as never, quantity: 2000 }),
    ]);
    expect(balances[0].balance).toBe(5000);
  });

  it('subtracts transferencia from source program', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000 }),
      op({ type: 'transferencia' as never, quantity: 4000 }),
    ]);
    expect(balances[0].balance).toBe(6000);
  });

  it('clamps negative balances to zero per program', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 1000 }),
      op({ type: 'venda' as never, quantity: 5000 }),
    ]);
    expect(balances[0].balance).toBe(0);
  });

  it('ignores operations with status !== confirmado', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000 }),
      op({ type: 'compra' as never, quantity: 99999, status: 'pendente' }),
    ]);
    expect(balances[0].balance).toBe(10000);
  });

  it('computes per-program separately', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000, program: 'Smiles' }),
      op({ type: 'compra' as never, quantity: 7000, program: 'Latam Pass' }),
    ]);
    expect(balances).toHaveLength(2);
    expect(balances.find((b) => b.program === 'Smiles')!.balance).toBe(10000);
    expect(balances.find((b) => b.program === 'Latam Pass')!.balance).toBe(7000);
  });

  it('sorts balances by balance descending', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 3000, program: 'A' }),
      op({ type: 'compra' as never, quantity: 10000, program: 'B' }),
      op({ type: 'compra' as never, quantity: 7000, program: 'C' }),
    ]);
    expect(balances.map((b) => b.program)).toEqual(['B', 'C', 'A']);
  });

  it('computes average cost from purchases only', () => {
    const balances = computeProgramBalances([
      op({ type: 'compra' as never, quantity: 10000, total_cost: 200 }), // 20 R$/k
    ]);
    expect(balances[0].averageCost).toBe(20);
  });
});

describe('computeTotalBalance', () => {
  it('sums per-program clamped balances across all programs', () => {
    const total = computeTotalBalance([
      op({ type: 'compra' as never, quantity: 10000, program: 'A' }),
      op({ type: 'compra' as never, quantity: 7000, program: 'B' }),
    ]);
    expect(total).toBe(17000);
  });

  it('clamps per-program (not global) — negative on one does not cancel positive on another', () => {
    const total = computeTotalBalance([
      op({ type: 'compra' as never, quantity: 5000, program: 'A' }),
      op({ type: 'venda' as never, quantity: 10000, program: 'B' }), // would go negative
    ]);
    // B clamps to 0 first; A still contributes 5000. Global = 5000, NOT -5000.
    expect(total).toBe(5000);
  });
});

describe('computeHolderStats', () => {
  it('filters by holder_id before computing balances', () => {
    const stats = computeHolderStats(
      [
        op({ type: 'compra' as never, quantity: 10000, holder_id: 'h1' }),
        op({ type: 'compra' as never, quantity: 99999, holder_id: 'h2' }),
      ],
      'h1',
    );
    expect(stats.totalMiles).toBe(10000);
    expect(stats.programs).toBe(1);
  });

  it('returns zero-shaped result when no operations match', () => {
    const stats = computeHolderStats([], 'h1');
    expect(stats).toEqual({ totalMiles: 0, totalValue: 0, programs: 0 });
  });
});
