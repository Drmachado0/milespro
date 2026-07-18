/**
 * Haptic Feedback utility for mobile devices
 * Uses the Vibration API when available
 */
import { logger } from "@/lib/logger";

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const vibrationPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50, 100, 50],
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback
 * @param style - The style of haptic feedback
 */
export const haptic = (style: HapticStyle = 'light'): void => {
  if (!isHapticSupported()) return;
  
  try {
    const pattern = vibrationPatterns[style];
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not allowed
    logger.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger haptic feedback for button press
 */
export const hapticButton = (): void => haptic('light');

/**
 * Trigger haptic feedback for successful action
 */
export const hapticSuccess = (): void => haptic('success');

/**
 * Trigger haptic feedback for warning/error
 */
export const hapticWarning = (): void => haptic('warning');

/**
 * Trigger haptic feedback for error
 */
export const hapticError = (): void => haptic('error');

/**
 * Trigger haptic feedback for selection change
 */
export const hapticSelection = (): void => haptic('light');

/**
 * Trigger haptic feedback for impact (heavier)
 */
export const hapticImpact = (): void => haptic('medium');
