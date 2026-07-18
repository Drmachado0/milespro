import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vibrate API for jsdom
const mockVibrate = vi.fn(() => true);

describe('haptics', () => {
  let haptic: typeof import('./haptics').haptic;
  let hapticButton: typeof import('./haptics').hapticButton;
  let hapticSuccess: typeof import('./haptics').hapticSuccess;
  let hapticWarning: typeof import('./haptics').hapticWarning;
  let hapticError: typeof import('./haptics').hapticError;
  let hapticImpact: typeof import('./haptics').hapticImpact;

  beforeEach(async () => {
    mockVibrate.mockClear();
    (navigator as unknown as { vibrate: typeof mockVibrate }).vibrate = mockVibrate;
    const mod = await import('./haptics');
    haptic = mod.haptic;
    hapticButton = mod.hapticButton;
    hapticSuccess = mod.hapticSuccess;
    hapticWarning = mod.hapticWarning;
    hapticError = mod.hapticError;
    hapticImpact = mod.hapticImpact;
  });

  it('calls vibrate with correct patterns', () => {
    haptic('light');
    expect(mockVibrate).toHaveBeenCalledWith(10);
    haptic('heavy');
    expect(mockVibrate).toHaveBeenCalledWith(50);
    haptic('success');
    expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
    haptic('error');
    expect(mockVibrate).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
  });

  it('convenience wrappers work', () => {
    hapticButton(); expect(mockVibrate).toHaveBeenCalledWith(10);
    hapticSuccess(); expect(mockVibrate).toHaveBeenCalledWith([10, 50, 10]);
    hapticWarning(); expect(mockVibrate).toHaveBeenCalledWith([25, 50, 25]);
    hapticError(); expect(mockVibrate).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
    hapticImpact(); expect(mockVibrate).toHaveBeenCalledWith(25);
  });

  it('does not throw when vibrate throws', () => {
    mockVibrate.mockImplementation(() => { throw new Error('denied'); });
    expect(() => haptic('light')).not.toThrow();
  });
});
