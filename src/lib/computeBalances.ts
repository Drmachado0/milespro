/**
 * Single source-of-truth for "current mile balance per program".
 *
 * Why this exists (QA audit sas.txt Bug 3): the same logical question
 * — "how many miles does this user have right now?" — was being answered
 * by three different reducers across the codebase, each with slightly
 * different rules:
 *   - useProgramBalances: ADD compra+entrada+turbo+bumerangue; SUB venda+resgate+transferencia; Math.max(0) per-program
 *   - useReportData.summary.totalMiles: same ADD; SUB venda+resgate ONLY (no transferencia!); Math.max(0) global
 *   - Titulares.getHolderStats fallback: same as useProgramBalances but per holder_id, with a separate read from program_balances when available
 *
 * Result: Dashboard, Titulares, Relatórios, and Análise Visual all showed
 * different totals for the same user (666.595 / 891.605 / 796.468 / 666.595
 * in the QA capture). That destroys trust in every other KPI on the screen.
 *
 * This module centralizes the math. Future consumers should import from
 * here rather than re-implementing the reducer.
 */

import type { Database } from '@/integrations/supabase/types';

type OperationType = Database['public']['Enums']['operation_type'];

export interface OperationLike {
  program: string;
  type: OperationType;
  quantity: number;
  total_cost?: number | null;
  status?: string | null;
  holder_id?: string | null;
}

export interface ProgramBalance {
  program: string;
  balance: number;
  totalInvested: number;
  averageCost: number;
  operationsCount: number;
}

const ADDING_OPERATIONS: OperationType[] = [
  'compra',
  'compra_turbinada',
  'entrada_manual',
  'bumerangue',
];

const SUBTRACTING_OPERATIONS: OperationType[] = [
  'venda',
  'resgate',
];

/**
 * Compute per-program balances from a flat list of operations.
 *
 * Rules (canonical — every consumer must use these):
 *   - Only `status === 'confirmado'` operations contribute. Callers can
 *     pre-filter or pass everything; we filter defensively here.
 *   - `transferencia` subtracts from the source program. The target
 *     program is captured by a separate row at insert time (or via the
 *     associated split — caller's responsibility).
 *   - Per-program balances are clamped to >= 0. A negative reading
 *     usually means missing/uninstrumented operation history; we never
 *     surface a negative miles count to the UI.
 *
 * Pure function — no side effects, no React. Trivially testable.
 */
export function computeProgramBalances<T extends OperationLike>(
  operations: T[],
): ProgramBalance[] {
  const programMap = new Map<string, {
    balance: number;
    totalInvested: number;
    totalQuantityPurchased: number;
    operationsCount: number;
  }>();

  for (const op of operations) {
    if (op.status && op.status !== 'confirmado') continue;

    const current = programMap.get(op.program) ?? {
      balance: 0,
      totalInvested: 0,
      totalQuantityPurchased: 0,
      operationsCount: 0,
    };
    current.operationsCount += 1;

    if (ADDING_OPERATIONS.includes(op.type)) {
      current.balance += op.quantity;
      if (op.total_cost && op.total_cost > 0) {
        current.totalInvested += op.total_cost;
        current.totalQuantityPurchased += op.quantity;
      }
    } else if (SUBTRACTING_OPERATIONS.includes(op.type)) {
      current.balance -= op.quantity;
    } else if (op.type === 'transferencia') {
      current.balance -= op.quantity;
    }

    programMap.set(op.program, current);
  }

  const result: ProgramBalance[] = [];
  programMap.forEach((data, program) => {
    const averageCost = data.totalQuantityPurchased > 0
      ? (data.totalInvested / data.totalQuantityPurchased) * 1000
      : 0;
    result.push({
      program,
      balance: Math.max(0, data.balance),
      totalInvested: data.totalInvested,
      averageCost: Number(averageCost.toFixed(2)),
      operationsCount: data.operationsCount,
    });
  });

  return result.sort((a, b) => b.balance - a.balance);
}

/**
 * Total mile count across all programs for the given operations.
 * Uses the same rules as `computeProgramBalances`; per-program Math.max(0)
 * is applied BEFORE summing so a phantom negative on one program can't
 * cancel out a real positive on another.
 */
export function computeTotalBalance<T extends OperationLike>(
  operations: T[],
): number {
  return computeProgramBalances(operations).reduce((sum, b) => sum + b.balance, 0);
}

/**
 * Filter operations to a single holder_id and compute their balances.
 * Returns zero counts when no operations match — never a NaN or negative.
 */
export function computeHolderStats<T extends OperationLike>(
  operations: T[],
  holderId: string,
): { totalMiles: number; totalValue: number; programs: number } {
  const holderOps = operations.filter((op) => op.holder_id === holderId);
  const balances = computeProgramBalances(holderOps);
  const totalMiles = balances.reduce((sum, b) => sum + b.balance, 0);
  const totalValue = balances.reduce((sum, b) => sum + (b.balance / 1000) * b.averageCost, 0);
  return { totalMiles, totalValue, programs: balances.length };
}
