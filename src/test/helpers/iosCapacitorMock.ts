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

let _value = false;

export function mockIsIOSCapacitor(): void {
  vi.mock('@/hooks/useIsIOSCapacitor', () => ({
    useIsIOSCapacitor: () => _value,
    isIOSCapacitor: () => _value,
  }));

  beforeEach(() => {
    _value = false;
  });
}

export function setIsIOSCapacitor(value: boolean): void {
  _value = value;
}
