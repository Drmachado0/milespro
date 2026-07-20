import { vi, beforeEach } from 'vitest';

/**
 * Test helper for toggling the canonical iOS Path C runtime gate.
 *
 * Use in any *.test.tsx that needs to render a component in both branches
 * (iOS = pricing UI hidden, non-iOS = pricing UI rendered).
 *
 * Usage:
 *   import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';
 *
 *   mockIsIOSCapacitor();  // call once at top of file
 *
 *   describe('Component', () => {
 *     it('hides pricing on iOS', () => {
 *       setIsIOSCapacitor(true);
 *       const { queryByText } = render(<Component />);
 *       expect(queryByText('R$ 37,90')).toBeNull();
 *     });
 *
 *     it('shows pricing on non-iOS', () => {
 *       setIsIOSCapacitor(false);
 *       const { getByText } = render(<Component />);
 *       expect(getByText('R$ 37,90')).toBeInTheDocument();
 *     });
 *   });
 */

const state = vi.hoisted(() => ({ value: false }));

vi.mock('@/hooks/useIsIOSCapacitor', () => ({
  useIsIOSCapacitor: () => state.value,
  isIOSCapacitor: () => state.value,
}));

beforeEach(() => {
  state.value = false;
});

export function mockIsIOSCapacitor(): void {
  // Kept as a compatibility no-op for existing tests. The mock must be
  // declared at module scope so Vitest can hoist it deterministically.
}

export function setIsIOSCapacitor(value: boolean): void {
  state.value = value;
}
