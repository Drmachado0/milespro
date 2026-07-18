/**
 * Development-only Logger
 * 
 * In production, all methods are no-ops for performance.
 * In development, logs with contextual prefixes.
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

const isDev = import.meta.env.DEV;

// No-op function for production
const noop = () => {};

// Create log function for development
const createLogFn = (level: LogLevel) => {
  if (!isDev) return noop;
  
  return (...args: unknown[]) => {
    const timestamp = new Date().toLocaleTimeString();
    console[level](`[${timestamp}]`, ...args);
  };
};

/**
 * Logger instance
 * 
 * Usage:
 * logger.log('[Auth]', 'User logged in');
 * logger.error('[API]', 'Failed to fetch', error);
 * logger.warn('[Security]', 'Suspicious activity detected');
 * logger.info('[App]', 'Application initialized');
 * logger.debug('[Debug]', 'Variable value:', someVar);
 */
export const logger: Logger = {
  log: createLogFn('log'),
  error: createLogFn('error'),
  warn: createLogFn('warn'),
  info: createLogFn('info'),
  debug: createLogFn('debug'),
};

// Default export for convenience
export default logger;
